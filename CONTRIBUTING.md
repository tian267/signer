# Contributing to LAN-IOT Signer

Thank you for your interest in contributing to LAN-IOT Signer! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and collaborative environment.

## How to Contribute

### Reporting Issues

- Check if the issue already exists in the issue tracker
- Provide a clear description of the problem
- Include steps to reproduce the issue
- Specify your environment (Node.js version, OS, deployment platform)
- Include relevant log output

### Submitting Changes

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**:
   - Follow the existing code style
   - Add comments for complex logic
   - Test your changes thoroughly
4. **Commit your changes**:
   ```bash
   git commit -m "Add: brief description of changes"
   ```
   Use conventional commit messages:
   - `Add:` for new features
   - `Fix:` for bug fixes
   - `Update:` for improvements
   - `Docs:` for documentation changes
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request**

### Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Ensure all tests pass
- Update documentation if needed
- Keep changes focused and atomic

## Development Setup

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- OpenSSL (for certificate operations)
- Git

### Setting Up Development Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/laniot/signer.git
   cd signer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment configuration:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. Run the server:
   ```bash
   npm start
   ```

## Code Style

### JavaScript/Node.js
- Use 2 spaces for indentation
- Use ES6+ modern JavaScript features
- Use `async/await` for asynchronous operations
- Follow existing code patterns
- Use descriptive variable and function names

### Naming Conventions
- `camelCase` for functions and variables
- `PascalCase` for classes
- `UPPER_SNAKE_CASE` for constants
- Use descriptive names that convey intent

### Comments
- Use `//` for single-line comments
- Use `/** */` for JSDoc documentation
- Document public APIs and complex logic

## Testing

Before submitting a pull request:

1. Run the linter (if configured):
   ```bash
   npm run lint
   ```

2. Test the server locally:
   ```bash
   npm start
   ```

3. Test the `/v1/sign` endpoint with valid credentials
4. Verify certificate generation works correctly
5. Test rate limiting functionality
6. Test with different certificate formats (PEM, base64, DER)

## Documentation

- Update README.md if adding new features
- Update DEPLOYMENT.md for deployment-related changes
- Add inline code documentation
- Update configuration examples if needed

## Security

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead, please email security concerns privately to the maintainers.

### Handling Credentials

- Never commit secrets, tokens, or certificates
- Use `.env.example` as a template only
- Ensure `.env` and certificate files are in `.gitignore`
- Test with non-production credentials

## Areas for Contribution

We welcome contributions in the following areas:

### Features
- Support for additional certificate formats
- HSM/KMS integration for production deployments
- Device allowlist/whitelist management
- Certificate revocation list (CRL) support
- Metrics and monitoring endpoints
- Automated certificate renewal notifications

### Documentation
- Usage examples
- Deployment guides for different platforms
- Troubleshooting tips
- Security best practices
- Architecture diagrams

### Testing
- Unit tests
- Integration tests
- Load testing
- Security testing

### Bug Fixes
- Check the issue tracker for open bugs
- Verify and fix reported issues
- Improve error handling

### Performance
- Optimize certificate generation
- Improve rate limiting
- Reduce memory usage
- Enhance concurrent request handling

## License

By contributing to LAN-IOT Signer, you agree that your contributions will be licensed under the Apache License 2.0.

## Questions?

If you have questions about contributing, feel free to:
- Open a discussion in the repository
- Ask in the issues section (for general questions)
- Check existing documentation

## Recognition

Contributors will be recognized in the CONTRIBUTORS.md file and project release notes.

Thank you for contributing to LAN-IOT Signer! 🎉
