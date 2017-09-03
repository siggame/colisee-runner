#!/bin/bash -a

source .env
envsubst < docker-compose.template.yml > docker-compose.yml
