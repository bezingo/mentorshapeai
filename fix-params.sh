#!/bin/bash

# Fix Next.js 16 params changes in route handlers
# This script updates all route handlers to use Promise<{ id: string }> for params

echo "Fixing app/api/profile/skills/[id]/route.ts..."
sed -i '' 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' app/api/profile/skills/[id]/route.ts

echo "Fixing app/api/profile/educations/[id]/route.ts..."
sed -i '' 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' app/api/profile/educations/[id]/route.ts

echo "Fixing app/api/profile/work-experiences/[id]/route.ts..."
sed -i '' 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' app/api/profile/work-experiences/[id]/route.ts

echo "Done! Now updating params.id references..."
