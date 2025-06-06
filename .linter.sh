#!/bin/bash
cd /home/kavia/workspace/code-generation/weatherwatch-108148-7c16990a/weatherwatch
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

