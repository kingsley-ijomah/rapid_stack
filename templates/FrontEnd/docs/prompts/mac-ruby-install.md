# Prompt for generating backend

### Installing Ruby Mac

#### step 1
check version of brew installed on my machine

#### step 2
Generate a shell command to install Homebrew on macOS. The command should use curl to download the installation script from the official Homebrew repository on GitHub and execute it using bash.

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

Note: if prompted for password, enter your computer password, it will not show when you type but still type carefully

#### step 3
brew install readline libyaml gmp

#### step 4
brew install openssl@1.1
brew link --overwrite openssl@1.1

#### step 5
echo $SHELL

/bin/zsh  => ~/.zshrc
/bin/bash => ~/.bashrc
/bin/ksh  => ~/.kshrc
/bin/sh   => ~/.profile

#### Step 6
"Generate shell commands to update the PATH environment variable for OpenSSL 1.1 by appending it to my shell file and sourcing the file to apply the changes."

echo 'export PATH="/usr/local/opt/openssl@1.1/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

#### Step 7

\curl -sSL https://get.rvm.io | bash -s stable

#### Step 8
echo 'export PATH="$HOME/.rvm/bin:$PATH"' >> ~/.zshrc
echo 'source "$HOME/.rvm/scripts/rvm"' >> ~/.zshrc

#### Step 9
source ~/.zshrc

#### Step 10
rvm install 3.3.1 --with-openssl-dir=$(brew --prefix openssl@1.1)

#### Step 11
rvm use 3.3.1 --default

#### Step 12
ruby -v