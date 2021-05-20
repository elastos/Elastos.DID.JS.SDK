# How to test during SDK development

- Open 2 VSCode instances, one for the SDK, one for the tests/ folder.
- `npm run build` from the root folder when the SDK is changed.
- `npm link ..` (every time after calling `npm install` or `npm update`) from the tests/ folder.
- `npm run test:node` to run the tests.
