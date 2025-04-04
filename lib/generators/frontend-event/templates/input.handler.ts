export const inputHandlerTemplate = `
<%= handlerMethod %>(event: Event) {
  const input = event.target as HTMLIonInputElement;
  const value = input.value?.toString() || '';
  
  // Handle input change
  console.log('Input value changed:', value);
  
  // Add your input processing logic here
  this.processInput(value);
}

private processInput(value: string) {
  // Add your custom input processing logic
  // For example: filtering, validation, API calls, etc.
}
`; 