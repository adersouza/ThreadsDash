# Quick Start Guide: Using Claude Code to Build Your Threads Dashboard

## What is Claude Code?

Claude Code is a command-line tool that lets you delegate coding tasks to Claude directly from your terminal. It's perfect for building full applications like your Threads dashboard.

---

## Installation

```bash
# Install Claude Code (requires Node.js)
npm install -g @anthropic-ai/claude-code

# Or with Homebrew (macOS)
brew install claude-code

# Verify installation
claude-code --version
```

---

## Getting Started

### 1. Set Up API Key

```bash
# Set your Anthropic API key as environment variable
export ANTHROPIC_API_KEY='your_api_key_here'

# Or add to your shell profile (~/.zshrc or ~/.bashrc)
echo 'export ANTHROPIC_API_KEY="your_api_key_here"' >> ~/.zshrc
source ~/.zshrc
```

### 2. Create Project Directory

```bash
mkdir threads-dashboard
cd threads-dashboard
```

### 3. Start Claude Code Session

```bash
# Start interactive session
claude-code

# Or start with a specific task
claude-code "Build a React app with TypeScript and Firebase"
```

---

## How to Use the Project Specifications

You have two comprehensive documents:
1. **threads-dashboard-spec.md** - Complete technical specification
2. **claude-code-prompt.md** - Step-by-step implementation guide

### Method 1: Interactive Approach (Recommended)

Start Claude Code and feed it instructions phase by phase:

```bash
claude-code
```

Then in the Claude Code session:

**Phase 1 - Foundation:**
```
Read the file claude-code-prompt.md and implement Phase 1: Foundation.
Set up the React + TypeScript project with Vite, install all dependencies,
configure Tailwind CSS, set up Firebase configuration, create TypeScript types,
and implement the authentication system as specified.
```

**Phase 2 - Dashboard:**
```
Now implement Phase 2: Core Dashboard from claude-code-prompt.md.
Create the dashboard layout, account state management with Zustand,
Firestore hooks for real-time data, the dashboard page with account cards,
and all the components specified.
```

**Continue for each phase...**

### Method 2: Single Large Prompt

```bash
claude-code "Read claude-code-prompt.md and implement the entire Threads Dashboard application following all phases in order. Start with Phase 1 (Foundation), then proceed through Phase 2 (Core Dashboard), Phase 3 (Post Scheduling), Phase 4 (AI Features), Phase 5 (Analytics), and Phase 6 (Cloud Functions). Implement each phase completely before moving to the next."
```

### Method 3: Targeted Feature Development

If you want specific features:

```bash
# Just the post scheduling system
claude-code "Read the Post Scheduling section from claude-code-prompt.md and implement a complete post composer with calendar view, using React, TypeScript, and Firebase"

# Just the AI features
claude-code "Implement the AI-powered content optimization features from claude-code-prompt.md, including caption enhancement, topic suggestions, and optimal time calculations"
```

---

## Best Practices for Working with Claude Code

### 1. Be Specific with Context
Always reference the specification files:
```
"Read threads-dashboard-spec.md and implement [specific feature]"
```

### 2. Work in Phases
Don't try to build everything at once. Build phase by phase:
- Phase 1: Get authentication working
- Phase 2: Build the dashboard
- Phase 3: Add post scheduling
- Phase 4: Add AI features
- Phase 5: Add analytics
- Phase 6: Add Cloud Functions

### 3. Test After Each Phase
```bash
# After each phase, test the app
npm run dev

# Open browser to http://localhost:5173
```

### 4. Fix Issues Iteratively
If something doesn't work:
```
"The authentication isn't working. The error is: [paste error]. 
Looking at the AuthProvider.tsx file, can you fix this?"
```

### 5. Ask for Clarifications
```
"Looking at the database schema in threads-dashboard-spec.md, 
can you explain how the analytics collection relates to posts?"
```

---

## Common Commands in Claude Code Session

```bash
# Create a new file
"Create a new file src/components/AccountCard.tsx with [description]"

# Edit existing file
"Edit src/App.tsx to add routing for the Analytics page"

# Install dependencies
"Install recharts and react-big-calendar packages"

# Run commands
"Run npm run dev to start the development server"

# Debug issues
"Debug why the posts aren't showing in the calendar view"

# Review code
"Review the PostComposer component and suggest improvements"

# Generate tests
"Create unit tests for the aiService.ts file"
```

---

## Typical Workflow

### Day 1: Foundation
```bash
claude-code

> "Read claude-code-prompt.md and set up the project foundation:
1. Create React + TypeScript + Vite project
2. Install all dependencies listed in Step 1
3. Configure Tailwind CSS
4. Set up Firebase configuration
5. Create all TypeScript type definitions
6. Implement complete authentication system with login/signup"

# After it's done, test:
> "Run npm run dev"
# Open browser, test login/signup

> "Great! Now commit this phase:"
> "Run git init && git add . && git commit -m 'Phase 1: Foundation complete'"
```

### Day 2: Dashboard
```bash
claude-code

> "Continue from Phase 2 of claude-code-prompt.md:
1. Create the dashboard layout with sidebar navigation
2. Set up Zustand store for account management
3. Create Firestore hooks for real-time data
4. Build the dashboard page with account cards
5. Implement the stats overview component"

# Test the dashboard
> "Run npm run dev"

# If issues:
> "The AccountCard component isn't displaying the follower count correctly. 
Looking at the code, can you fix the formatting?"
```

### Day 3: Post Scheduling
```bash
claude-code

> "Implement Phase 3 from claude-code-prompt.md:
1. Create post store with Zustand
2. Build the post composer with rich text editor
3. Implement calendar view with react-big-calendar
4. Add media upload functionality
5. Create scheduling logic with date/time picker"
```

### Day 4: AI Features
```bash
claude-code

> "Implement Phase 4 (AI Features):
1. Create aiService.ts with Anthropic API integration
2. Add caption enhancement functionality
3. Add topic/hashtag suggestions
4. Implement optimal posting time calculations
5. Integrate AI features into the post composer UI"
```

### Day 5: Analytics
```bash
claude-code

> "Implement Phase 5 (Analytics):
1. Create analyticsService.ts
2. Build analytics dashboard with Recharts
3. Implement KPI cards
4. Add follower growth chart
5. Create optimal times display
6. Add insights and recommendations panel"
```

### Day 6-7: Cloud Functions
```bash
claude-code

> "Implement Phase 6 (Cloud Functions):
1. Set up Firebase Functions directory
2. Create scheduledPosts function for auto-publishing
3. Create syncAnalytics function for data collection
4. Create healthMonitor function for account monitoring
5. Implement Threads API integration
6. Deploy functions to Firebase"
```

---

## Debugging Tips

### Common Issues and Solutions

**Issue: TypeScript errors**
```
"Fix all TypeScript errors in the project. Show me each error and the fix."
```

**Issue: Firebase not connecting**
```
"The Firebase connection is failing with error: [error]. 
Check the firebase.ts configuration and fix it."
```

**Issue: Component not rendering**
```
"The AccountCard component isn't rendering. Debug the component and 
check if the props are being passed correctly."
```

**Issue: Styles not applying**
```
"Tailwind styles aren't working. Check the tailwind.config.js and 
make sure it's set up correctly."
```

**Issue: API calls failing**
```
"The Anthropic API calls are failing. Check the aiService.ts file and 
ensure the API key is configured correctly."
```

---

## Advanced Usage

### Custom Modifications

```bash
# Add a new feature not in the spec
claude-code "Add a feature to export analytics as PDF. 
Use jsPDF library and create a button in the Analytics page."

# Modify existing feature
claude-code "Modify the post composer to support video uploads in addition to images.
Update the media uploader and preview components."

# Optimize performance
claude-code "Review the Dashboard component and optimize it for better performance.
Consider using React.memo, useMemo, and lazy loading."
```

### Integration with Your Existing Tools

```bash
# AdsPower integration
claude-code "Read the AdsPower API documentation and create a service
to integrate with my existing AdsPower profiles. The API endpoint is
http://local.adspower.net:50325/api/v1/"

# Proxy integration
claude-code "Add proxy rotation functionality to the threadsApi.ts service.
I have a list of ISP proxies in proxies.json. Rotate through them for each request."
```

---

## Monitoring Progress

### Check What's Been Built
```bash
# List all files created
ls -R src/

# Check specific file
cat src/components/dashboard/AccountCard.tsx

# Test the app
npm run dev
```

### Review Code Quality
```
"Review the entire codebase and provide suggestions for:
1. Code quality improvements
2. Performance optimizations
3. Security enhancements
4. TypeScript best practices"
```

---

## Deployment

### When Ready to Deploy

```bash
claude-code

> "Prepare the application for production deployment:
1. Create production environment variables
2. Build the application
3. Set up Firebase Hosting
4. Deploy Cloud Functions
5. Configure Firestore security rules
6. Deploy to Firebase"

# Follow the deployment steps
> "Run npm run build"
> "Run firebase deploy"
```

---

## Cost Estimation

**Claude Code Usage:**
- Uses Claude Sonnet 4 by default
- ~$3 per 1M input tokens, ~$15 per 1M output tokens
- Building this entire project: approximately $10-30 depending on iterations

**Tips to Minimize Costs:**
1. Work phase by phase (more efficient than single massive prompt)
2. Be specific in requests (reduces back-and-forth)
3. Use the specification documents (Claude can reference them efficiently)
4. Test frequently (catch issues early)

---

## Getting Help

### Within Claude Code
```
"I'm stuck on [problem]. Looking at threads-dashboard-spec.md, 
what's the best approach to solve this?"

"Explain how the post scheduling system works based on the specification"

"What's the difference between the post store and account store?"
```

### Documentation References
```
"Show me examples of using Firestore queries based on the project spec"

"How should I structure the analytics data according to the database schema?"

"What are the security considerations mentioned in the specification?"
```

---

## Success Checklist

After completion, verify:

- [ ] ✅ Authentication works (signup, login, logout)
- [ ] ✅ Can add and view Threads accounts
- [ ] ✅ Dashboard displays account stats correctly
- [ ] ✅ Can create and schedule posts
- [ ] ✅ Calendar view shows scheduled posts
- [ ] ✅ AI caption enhancement works
- [ ] ✅ Topic suggestions work
- [ ] ✅ Analytics dashboard displays data
- [ ] ✅ Charts render correctly
- [ ] ✅ Cloud Functions deploy successfully
- [ ] ✅ Scheduled posts get published
- [ ] ✅ Account health monitoring works
- [ ] ✅ Media library functional
- [ ] ✅ App is responsive on mobile
- [ ] ✅ Security rules protect data
- [ ] ✅ App deployed to Firebase

---

## Final Notes

**The Two Key Documents:**

1. **threads-dashboard-spec.md** = The "what" (features, architecture, database)
2. **claude-code-prompt.md** = The "how" (implementation steps, code examples)

**Recommended Approach:**
- Use claude-code-prompt.md as your primary guide
- Reference threads-dashboard-spec.md for detailed specifications
- Build phase by phase
- Test after each phase
- Iterate on issues immediately

**Starting Command:**
```bash
cd threads-dashboard
claude-code "Read claude-code-prompt.md and begin implementing Phase 1: Foundation. 
Set up the complete React + TypeScript + Firebase project with authentication."
```

Good luck! 🚀
