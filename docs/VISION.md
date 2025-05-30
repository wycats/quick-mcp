# Vision and Principles

> [!NOTE]
>
> This document was created as a broad vision for the quick-mcp project,
> outlining its purpose, principles, and goals. It serves as a guide for
> developers to understand the project's direction and how it aims to simplify
> the integration of AI capabilities into existing APIs.

---

> "Just as Rails made me a programmer by making the right thing the easy thing,
> quick-mcp makes every API developer an AI platform developer by removing
> unnecessary complexity."

## Why This Exists

The MCP ecosystem teaches patterns that work great for personal developer tools
but break the moment you need to serve anyone else. Every example stores state
in memory, ignores user context, and assumes localhost deployment.

Meanwhile, developers already know how to build production-ready APIs. Web
frameworks solved multi-user authentication, data persistence, connection
pooling, and monitoring decades ago.

So why are we asking developers to rebuild all of this from scratch just to add
AI capabilities?

## The Vision

**quick-mcp bridges the gap between production-ready APIs and the MCP
protocol.**

Instead of starting with MCP SDKs and reimplementing basic infrastructure,
developers should:

1. Build solid APIs using frameworks they already know
2. Add MCP as a protocol layer without changing their code
3. Ship production-ready MCP servers that work for more than one user

This isn't about gatekeeping AI capabilities behind complex infrastructure. It's
about making AI accessible to every developer who can build an API—which is to
say, every developer.

## Core Principles

### APIs Are the Foundation

- Every MCP server is really just an API that speaks a specific protocol
- Production patterns (auth, persistence, monitoring) aren't optional
- Web frameworks already encode these best practices

### MCP Is a Protocol, Not a Framework

- MCP should adapt to your API, not the other way around
- No code changes required to make an API MCP-compatible
- Protocol concerns stay at the infrastructure layer

### Convention Over Configuration

- The right patterns should be the default
- Common cases should be zero-config
- Advanced users can customize without starting over

### Reduce Cognitive Load

- Developers shouldn't think about protocol translation
- Focus on business logic, not infrastructure
- Make the easy thing the right thing

### Ergonomic Curation Matters

- APIs designed for programs aren't automatically good for AI
- Task-oriented tools beat endpoint soup every time
- Composition and transformation are first-class features
- The goal is AI success, not just API exposure

### Enable Every Developer

- If you can build an API, you can build an MCP server
- No need to become a distributed systems expert
- Your existing skills are enough
- AI capabilities shouldn't require starting from zero

## What quick-mcp Does

quick-mcp isn't just protocol translation—it's thoughtful curation for AI
ergonomics.

```yaml
# ❌ Bad: Exposing raw endpoints forces AI to orchestrate
tools:
  - name: getAccount
    endpoint: GET /api/accounts/{id}
  - name: getContacts
    endpoint: GET /api/contacts?accountId={id}
  - name: getOpportunities
    endpoint: GET /api/opportunities?accountId={id}
  # AI needs to make 3+ calls and join data

# ✅ Good: Create a task-oriented endpoint in your API
tools:
  - name: prepareCustomerMeeting
    description: Get everything needed for a customer meeting
    endpoint: POST /api/meeting-prep/{accountId}
    # One tool, complete context, AI succeeds
```

Your API handles the data aggregation and shaping. quick-mcp handles the
protocol translation. The AI gets a tool that matches how it thinks about tasks.

The difference between "exposing APIs" and "designing for AI" is the difference
between a 36% and 95% success rate.

## What Success Looks Like

A developer can:

1. Build a normal REST API with their favorite framework
2. Add quick-mcp as a buildpack or proxy
3. **Design task-oriented tools that make sense to AI** (not just expose
   endpoints)
4. Deploy to production with confidence

Their MCP server automatically handles:

- Multiple concurrent users
- Proper authentication and authorization
- Data persistence across restarts
- Connection pooling and rate limiting
- Structured logging and monitoring
- Graceful shutdowns and health checks

And most importantly, their AI agents actually succeed at tasks because the
tools are designed for AI ergonomics, not just mechanical API translation.

## What This Enables

When you remove the artificial complexity of building MCP servers from scratch,
you enable:

- **Small teams** to add AI capabilities without hiring protocol experts
- **Solo developers** to compete with large platforms on AI features
- **Domain experts** to translate their knowledge into AI tools without becoming
  infrastructure experts
- **Existing applications** to gain AI superpowers through configuration, not
  rewrites

This isn't about making hard things easy. It's about recognizing that these
things were never hard—they were just made complicated by asking developers to
solve already-solved problems.

## Non-Goals

- **Not another web framework**: Use the framework you already love
- **Not an MCP SDK replacement**: For local tools, use MCP SDKs directly
- **Not magical**: Clear, predictable protocol translation

## Why Ergonomic Curation is Essential

Exposing 100 API endpoints as 100 MCP tools is easy. It's also useless.

AI agents don't think in terms of REST endpoints. They think in terms of tasks:
"prepare for a meeting," "analyze customer health," "find upsell opportunities."
When you force AI to orchestrate multiple API calls, handle pagination, and join
data across systems, you're setting it up for failure.

quick-mcp encourages designing task-oriented tools:

- **Start with user needs**: What is the AI trying to accomplish?
- **Shape your APIs accordingly**: Create endpoints that return complete context
- **Rich descriptions**: Help AI choose the right tool with clear, detailed
  descriptions
- **Efficiency**: One well-designed tool beats 20 granular endpoints

The goal isn't to make every API available to AI. It's to make AI successful at
accomplishing real tasks.

**You already understand your users' needs better than any framework**.
quick-mcp empowers you to translate that understanding into AI capabilities
without learning a new paradigm.

### Future Possibilities

As quick-mcp evolves, we might explore features like client-side
composition—allowing you to define tools that combine multiple endpoints without
changing your API. But the principle remains: the best place for business logic
and data aggregation is usually in your API, where you already have database
access, caching, and all your domain logic. quick-mcp should enhance what you
build, not replace it.

## The Bigger Picture

Every successful developer tool reduces cognitive load by encoding best
practices. Rails made web development accessible by making conventions the
default. quick-mcp aims to do the same for MCP servers.

Just as Rails enabled a print designer to become a programmer, quick-mcp enables
any API developer to become an AI platform builder. You don't need to understand
distributed systems, protocol design, or AI internals. You need to understand
your users' needs—and you already do.

The goal isn't to hide MCP or make it invisible. It's to put it in its proper
place—as a protocol layer that enhances your existing APIs rather than replacing
your entire infrastructure approach.

**This is about democratizing access to AI capabilities**. Every developer who's
built an API has the skills needed to serve AI agents. quick-mcp just removes
the artificial barriers.

## Getting Started

The happy path should be this simple:

```bash
# You have an API running on Heroku
heroku buildpacks:add heroku-community/quick-mcp

# Create mcp.yaml defining your tools
echo "tools:
  - name: myTool
    endpoint: POST /api/my-endpoint
    description: Does something useful" > mcp.yaml

# Deploy
git push heroku main

# Your API now speaks MCP
```

That's it. No SDKs. No rebuilding auth. No relearning databases. Just your solid
API, now accessible to AI agents.

**You just went from "API developer" to "AI platform developer" in three
commands**. Not because you learned something complex, but because the
complexity was never necessary in the first place.

## Contributing

When evaluating features or approaches, ask:

1. Does this reduce cognitive load for developers?
2. Does this encourage production-ready patterns?
3. Does this keep protocol concerns separate from business logic?
4. Does this make the right thing the easy thing?
5. Does this help developers create AI-ergonomic tools, not just expose
   endpoints?
6. **Does this expand who can build AI-powered applications?**

If yes to all, it belongs in quick-mcp.

Remember: Every barrier we remove is another developer empowered to build
something amazing.
