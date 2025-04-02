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
