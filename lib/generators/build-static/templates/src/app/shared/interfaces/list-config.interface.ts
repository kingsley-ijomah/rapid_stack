export interface ListConfig {
  title: string;              // Page title (e.g., 'Contacts', 'Products', etc.)
  icon: string;              // Icon name for empty state (e.g., 'people-outline', 'cart-outline')
  emptyStateConfig: {
    title: string;           // Empty state title (e.g., 'No Contacts Yet')
    message: string;         // Empty state message (e.g., 'Click the + button to add your first contact')
  };
  formConfig: {
    title: string;          // Form title (e.g., 'New Contact', 'Edit Contact')
    fields: FormField[];    // Form fields configuration
  };
}

export interface FormField {
  name: string;             // Field name (e.g., 'firstName')
  label: string;           // Field label (e.g., 'First Name')
  type: 'text' | 'email' | 'number' | 'tel' | 'date' | 'select';  // Input type
  required?: boolean;       // Whether field is required
  options?: {              // For select type fields
    value: any;
    label: string;
  }[];
  validators?: any[];      // Angular validators
} 