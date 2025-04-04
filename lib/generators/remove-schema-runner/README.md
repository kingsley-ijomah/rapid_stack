# Remove Schema Runner

This generator removes models that were created using the `schema-runner` generator. It reads the schema YAML file and removes all files that were created by that schema.

## Usage

```bash
rapid schema:remove
```

## What it does

1. Presents a list of available schema files from the `backend/_schema` directory
2. Asks for confirmation before proceeding
3. Reads the selected schema file
4. For each model defined in the schema:
   - Removes the model file from `backend/app/models/`
   - Removes the GraphQL type file from `backend/app/graphql/types/`
   - Removes any enum type files associated with the model

## Warning

This generator permanently deletes files. Make sure you have a backup or version control in place before using it.

## Example

If you have a schema file that created models for `User`, `Company`, and `Branch`, running this generator will:

1. Remove `user.rb`, `company.rb`, and `branch.rb` from the models directory
2. Remove `user_type.rb`, `company_type.rb`, and `branch_type.rb` from the GraphQL types directory
3. Remove any enum type files like `user_role_enum_type.rb` if they exist

## Notes

- This generator only removes files created by the schema. It does not handle database schema changes.
- If you need to undo database schema changes, you should use your database migration system (like Rails migrations). 