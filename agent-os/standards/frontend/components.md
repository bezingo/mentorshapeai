## UI component best practices

- **Single Responsibility**: Each component should have one clear purpose and do it well
- **Reusability**: Design components to be reused across different contexts with configurable props
- **Composability**: Build complex UIs by combining smaller, simpler components rather than monolithic structures
- **Clear Interface**: Define explicit, well-documented props with sensible defaults for ease of use
- **Encapsulation**: Keep internal implementation details private and expose only necessary APIs
- **Consistent Naming**: Use clear, descriptive names that indicate the component's purpose and follow team conventions
- **State Management**: Keep state as local as possible; lift it up only when needed by multiple components
- **Minimal Props**: Keep the number of props manageable; if a component needs many props, consider composition or splitting it
- **Documentation**: Document component usage, props, and provide examples for easier adoption by team members

## Logo Handling

- **Always use Brandfetch Logo API** for company/organization logos
- Use the `BrandfetchLogo` component from `@/components/ui/brandfetch-logo` for React components
- Use `getBrandfetchLogoUrl()` from `@/lib/brandfetch` for direct image URLs
- Store company domains in the database when available for accurate logo retrieval
- Support multiple logo types: `icon` (default), `logo`, and `symbol`
- Support light/dark themes based on UI context
- Never hardcode logo URLs or use placeholder images when Brandfetch can provide the logo
