# Comprehensive Prompting Framework for PRD to MVP with Cursor AI

## Stage 1: Generate the PRD (Foundation Stage)

### Prompt:
Generate a Product Requirements Document (PRD) for a [product idea]. The PRD should include: Purpose, Objectives, User Roles, Core Features, Technical Requirements, Risks, and Stakeholders. Format in Markdown for easy readability. the product idea is: [ ... ]

### Objective:
Get a complete, well-structured PRD as the foundation.

## Stage 2: Feature Expansion and Categorisation

### Prompt:
Expand the core features from the PRD into detailed functional requirements. List them as bullet check points and group them into categories such as 'User Management,' 'Security,' and 'Content Management.' This should only be applied to core features

### Objective:
Create a more detailed breakdown of the feature list for clarity.

## Stage 3: Prioritisation Using MoSCoW

### Prompt:
In a new section prioritise the following list of features using the MoSCoW method: Must-Have, Should-Have, Could-Have, and Won't-Have for MVP consideration. Consider user roles, technical complexity, and business impact. lets also have it as list of checks using the same format as we used in the core features

### Objective:
Organise features into priority groups for an MVP release.

## Stage 4: Define the MVP Scope

### Prompt:
Based on the MoSCoW prioritisation, generate a new section, for a Minimum Viable Product (MVP) definition, including only Must-Have features. Ensure it describes the core functionality necessary for launch and basic user validation. Don't update existing lines, create new section.

### Objective:
Isolate the essential features for a first working version of the product.

## Stage 5: Generate Required Frontend Pages

### Prompt:
Based on the core features listed in the MVP section, create a section and generate a list of all required frontend pages needed for the product. Include both functional and support pages necessary for a complete user experience. Don't update existing lines, create new section.

### Objective:
Identify all pages necessary for the frontend to cover the entire user journey.

## Stage 6: Generate User Stories for Each Page

### Prompt:
For each of the frontend pages listed, generate user stories using the format: 'As a [user role], I want to [goal] so that [outcome].' Ensure stories cover primary interactions and validation checks. Make each story as check list so I can mark it as done.

### Objective:
Break down the requirements into actionable user stories for clarity.