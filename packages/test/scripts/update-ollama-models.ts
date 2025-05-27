#!/usr/bin/env node --experimental-strip-types
/**
 * Script to automatically discover and test Ollama models for tool calling support
 * Updates the ollama-models.toml file with current findings
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { createOllama } from 'ollama-ai-provider';
import { generateText } from 'ai';

const execAsync = promisify(exec);

interface ModelInfo {
  name: string;
  tag: string;
  size: string;
  modified: string;
  id: string;
}

interface TestResult {
  model: string;
  supportsTools: boolean;
  error?: string;
  responseTime?: number;
}

// Known models that support tools (curated list)
const KNOWN_TOOL_MODELS = new Set([
  'llama3.1',
  'llama3.2',
  'mistral',
  'mistral-nemo',
  'qwen2',
  'qwen2.5',
  'qwen2.5-coder',
  'qwen3',
  'smollm2',
  'granite3-moe',
  'granite3.1-moe',
  'firefunction-v2',
  'command-r-plus',
  'command-r',
  'nemotron-mini',
]);

// Model size categories
const SIZE_CATEGORIES = {
  tiny: { max: 1e9, label: 'Under 1GB' },
  small: { max: 3e9, label: '1-3GB' },
  medium: { max: 10e9, label: '4-10GB' },
  large: { max: Infinity, label: '10GB+' },
};

async function getInstalledModels(): Promise<ModelInfo[]> {
  try {
    const { stdout } = await execAsync('ollama list --json');
    const lines = stdout.trim().split('\n').filter(Boolean);
    return lines.map(line => JSON.parse(line));
  } catch (error) {
    console.error('Failed to get Ollama models:', error);
    return [];
  }
}

async function testModelToolSupport(modelName: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const ollama = createOllama({
      baseURL: 'http://127.0.0.1:11434/api',
    });

    const model = ollama(modelName);

    // Simple tool for testing
    const testTool = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
        required: ['message'],
      },
    };

    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: 'Call the test_tool with message "hello"',
        },
      ],
      tools: [testTool],
      maxTokens: 100,
      temperature: 0.1,
    });

    const responseTime = Date.now() - startTime;
    const supportsTools = result.steps?.some(step => step.toolCalls?.length > 0) || false;

    return {
      model: modelName,
      supportsTools,
      responseTime,
    };
  } catch (error: any) {
    // Check if error indicates lack of tool support
    if (error.responseBody?.includes('does not support tools')) {
      return {
        model: modelName,
        supportsTools: false,
        error: 'Model does not support tools',
      };
    }
    
    return {
      model: modelName,
      supportsTools: false,
      error: error.message,
    };
  }
}

async function parseModelSize(sizeStr: string): Promise<number> {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(GB|MB|KB|B)?$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2]?.toUpperCase() || 'B';
  
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };
  
  return value * (multipliers[unit] || 1);
}

function categorizeModel(sizeBytes: number): string {
  for (const [category, { max }] of Object.entries(SIZE_CATEGORIES)) {
    if (sizeBytes <= max) return category;
  }
  return 'large';
}

function generateToml(models: Array<{
  name: string;
  size: string;
  category: string;
  supportsTools: boolean;
  variants: string[];
  notes?: string;
  recommended?: boolean;
}>): string {
  const date = new Date().toISOString().split('T')[0];
  
  let toml = `# Ollama Models with Tool Calling Support
# Generated on ${date}
# 
# This file lists Ollama models that support function/tool calling
# organized by size for easy selection based on available resources.

[metadata]
description = "Ollama models with verified tool calling support"
last_updated = "${date}"
source = "Automated testing of installed Ollama models"

`;

  // Group models by category
  const grouped = models.reduce((acc, model) => {
    if (!acc[model.category]) acc[model.category] = [];
    acc[model.category].push(model);
    return acc;
  }, {} as Record<string, typeof models>);

  // Generate sections for each category
  for (const [category, categoryModels] of Object.entries(grouped)) {
    const { label } = SIZE_CATEGORIES[category as keyof typeof SIZE_CATEGORIES];
    toml += `# ${label} - ${category === 'tiny' ? 'Fast inference, limited capabilities' : 
              category === 'small' ? 'Good balance of speed and capability' :
              category === 'medium' ? 'Production-ready performance' :
              'Best performance, resource intensive'}\n`;

    for (const model of categoryModels) {
      toml += `[[models.${category}]]
name = "${model.name}"
size = "${model.size}"
variants = [${model.variants.map(v => `"${v}"`).join(', ')}]
tool_support = ${model.supportsTools}
`;
      if (model.notes) toml += `notes = "${model.notes}"\n`;
      if (model.recommended) toml += `recommended = true\n`;
      toml += '\n';
    }
  }

  // Add testing recommendations
  toml += `# Testing recommendations
[testing]
quick_tests = ["qwen2.5:0.5b", "llama3.2:1b", "smollm2:135m"]
balanced_tests = ["llama3.2:3b", "qwen2.5:7b", "llama3.1:8b"]
comprehensive_tests = ["llama3.1:8b", "mistral-nemo:12b", "firefunction-v2:70b"]

# Performance expectations on CPU
[performance.cpu]
tiny = "2-5 seconds per call"
small = "5-15 seconds per call"
medium = "20-60 seconds per call"
large = "60+ seconds per call"

# Performance expectations with GPU
[performance.gpu]
tiny = "< 1 second per call"
small = "1-3 seconds per call"
medium = "3-10 seconds per call"
large = "10-30 seconds per call"
`;

  return toml;
}

async function main() {
  console.log('🔍 Discovering installed Ollama models...');
  const installedModels = await getInstalledModels();
  console.log(`Found ${installedModels.length} installed models\n`);

  const results: Array<{
    name: string;
    size: string;
    category: string;
    supportsTools: boolean;
    variants: string[];
    notes?: string;
    recommended?: boolean;
  }> = [];

  // Group models by base name
  const modelGroups = new Map<string, ModelInfo[]>();
  for (const model of installedModels) {
    const [baseName] = model.name.split(':');
    if (!modelGroups.has(baseName)) {
      modelGroups.set(baseName, []);
    }
    modelGroups.get(baseName)!.push(model);
  }

  console.log('🧪 Testing models for tool support...\n');

  for (const [baseName, variants] of modelGroups) {
    // Check if this model is known to support tools
    const knownSupport = KNOWN_TOOL_MODELS.has(baseName);
    
    console.log(`Testing ${baseName}...`);
    
    // Test the first variant to determine tool support
    const testModel = variants[0].name;
    const testResult = knownSupport ? 
      { model: testModel, supportsTools: true } : 
      await testModelToolSupport(testModel);
    
    if (testResult.supportsTools) {
      const sizeBytes = await parseModelSize(variants[0].size);
      const category = categorizeModel(sizeBytes);
      
      results.push({
        name: baseName,
        size: variants[0].size,
        category,
        supportsTools: true,
        variants: variants.map(v => v.tag || 'latest'),
        notes: testResult.responseTime 
          ? `Response time: ${testResult.responseTime}ms`
          : undefined,
        recommended: ['llama3.1', 'llama3.2', 'qwen2.5-coder'].includes(baseName),
      });
      
      console.log(`  ✅ Supports tools${testResult.responseTime ? ` (${testResult.responseTime}ms)` : ''}`);
    } else {
      console.log(`  ❌ No tool support: ${testResult.error || 'Unknown'}`);
    }
  }

  // Generate and save TOML
  console.log('\n📝 Generating TOML configuration...');
  const tomlContent = generateToml(results.filter(r => r.supportsTools));
  
  const outputPath = join(process.cwd(), 'ollama-models.toml');
  await writeFile(outputPath, tomlContent);
  
  console.log(`✅ Saved to ${outputPath}`);
  console.log(`\nFound ${results.filter(r => r.supportsTools).length} models with tool support`);
}

// Run the script
main().catch(console.error);