# Schema Runner Generator

This generator takes a schema file from the `backend/_schema` directory and generates model and GraphQL type files based on the schema.

## Usage

```bash
rapid schema:run
```

## What it does

1. Prompts you to select a schema file from the `backend/_schema` directory
2. Parses the schema file to extract model definitions
3. Generates Ruby model files in `backend/app/models`
4. Generates GraphQL type files in `backend/app/graphql/types`

## Schema Format

The schema file should be in YAML format and follow this structure:

```yaml
models:
  ModelName:
    attributes:
      field_name: Type required: true/false
      enum_field: Enum[value1, value2, value3](default: value1) required: true/false
      boolean_field: Boolean(default: true) required: true/false
      relationship_field_id: has_many required: true/false
```

## Supported Types

- String
- Integer
- Float
- Boolean
- Time
- Date
- DateTime
- Array
- Hash
- Object
- Enum

## Relationship Types

- has_many
- has_one
- has_and_belongs_to_many
- embeds_one
- embeds_many

## Special Models

The generator provides special handling for the `User` and `Company` models, using dedicated templates for these models.

## Example

```yaml
models:
  User:
    attributes:
      email: String required: true
      role: Enum[admin, user, guest](default: user) required: true
      company_id: has_many required: true
      
  Company:
    attributes:
      name: String required: true
      code: String required: true
      active: Boolean(default: true) required: true
      
  Product:
    attributes:
      name: String required: true
      price: Float required: true
      description: String
      status: Enum[active, inactive, discontinued](default: active) required: true
      company_id: has_many required: true
``` 