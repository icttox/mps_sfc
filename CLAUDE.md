# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Start server: `npm start`
- Development (server + client): `npm run dev`
- Server only: `npm run server`
- Client only: `npm run client`
- Install all dependencies: `npm run install-all`
- Client build: `cd client && npm run build`
- Client lint: `cd client && npm run lint`

## Code Style Guidelines
- React: Use functional components with hooks (useState, useEffect, useMemo)
- JavaScript: Use modern ES6+ syntax with arrow functions
- Naming: PascalCase for components, camelCase for variables/functions
- Event handlers: Prefix with 'handle' or 'on'
- Error handling: Use try/catch with specific error messages and HTTP status codes
- Server: Use async/await with proper error handling and logging
- Comments: Use JSDoc style for function documentation
- Formatting: 2-space indentation, single quotes for strings
- CSS: Use hyphenated lowercase for class names with component-specific prefixes
- Components: Export as default at end of file