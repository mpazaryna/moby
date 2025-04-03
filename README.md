# Moby For Dev

./moby.sh deploy all variant-be --version v0.11.0

# Start development container
./moby.sh dev start variant-be

# Stop container
./moby.sh dev stop variant-be

# Restart container
./moby.sh dev restart variant-be

# Rebuild and restart
./moby.sh dev rebuild variant-be

# View logs
./moby.sh dev logs variant-be
./moby.sh dev logs variant-be --follow

# Clean up resources
./moby.sh dev clean variant-be

# Specify custom port
./moby.sh dev start variant-be --port 3000
