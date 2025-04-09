## [1.0.9] - 2025-04-09
### Feat
- Added check for version with rapid --version or rapid -v

## [1.0.8] - 2025-04-09
### Feat
- Added a checker you need to run rapid init to initialize project
- Added ability to auto create frontend repo with rapid build:frontend
- Generating frontend will also add appName from rapid config file
- Create cloudflare domain and point to provisioned box
- Added 2factor auth to frontend:auth
- 2factor login you generate backend:auth

### Fix
- Fixed indentation issues with generating auth

### Change
- Removed domain, loadbalancer and spaces to be handled by cloudflare
- Refactor frontend:auth remove legacy code
- Update user model with has_one two_factor for backend:auth

## [1.0.7] - 2025-04-04
### Feat
- Added release script for auto deployment

## [1.0.7] - 2025-04-04
### Feat
- Added release script for auto deployment

## [1.0.7] - 2025-04-04
### Feat
- Added release script for auto deployment

## [1.0.7] - 2025-04-04
### Feat
- Added release script for auto deployment

## [1.0.7] - 2025-04-04
### Feat
- Added release script for auto deployment

## [1.0.7] - 2025-04-04
### Feat
- Added release script for auto deployment

## [1.0.7] - 2025-04-04
### Feat
- Added release script for auto deployment

## [1.0.6] - 2025-04-03
### Added
- In dev mode forgot password will auto launch letter opener

### Changed
- make installation clearer in gemspec

### Fixed
- Fixed issue with dev environment not sending mail with letter opener

## [1.0.5] - 2025-04-03
### Fixed
- remove npm as gem dependency

## [1.0.4] - 2025-04-03
### Added
- Ability to generate company with frontend:company

## [1.0.4] - 2025-04-03
### Added
- Ability to generate company with frontend:company

## [1.0.3] - 2025-04-02
### Added
- build graphql as part of fullstack generator
- Adding --yes option to skip prompts
- New generator build:fullstack scaffold for backend and frontend
- ability to install asdf dependencies
- running rapid init will use asdf to manage language ctl git ruby, node etc
- Install nix package with rapid init command
- Installing brew package with rapid init ensures shell path is updated

### Changed
- Now requires ruby >= 2.7.0 to download this gem

### Removed
- windows support from git and gh installer WSL encouraged

## [1.0.2] - 2025-03-27
### Changed
- Changed wrong formatting on gemspec

## [1.0.1] - 2025-03-27
### Added
- rapid init can now automatically install git and gh

### Changed
- Add automatic changelog to release script
- Add commit message convention to README

## [1.0.0] - 2025-03-26
### Added
- Make generators idempotent
- Added more generators

### Changed
- Renamed generators
- Grouped generators
- Used rapid instead of yo call

## [0.1.1] - 2025-03-13
### Fixed
- Fixed typo in Gemspec
- Other changes...

## [0.1.0] - 2024-03-XX
### Added
- Initial release
- CLI tool for project initialization
- Vault integration
- JWT authentication
- Mailer setup
- Docker configuration
- NGINX setup
