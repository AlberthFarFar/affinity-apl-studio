# Affinity Reference Reasoning Update

## Changed Files

REPLACE  
server.ts  
Changes reference analysis, carousel blueprint, final generation policy, and visual QA from photo preservation to product-identity reconstruction.

REPLACE  
src/types.ts  
Adds reference classification, hard identity constraints, soft scene attributes, and internal transformation policy to master analysis.

REPLACE  
src/components/Step3Carousel.tsx  
Passes existing master analysis and reference metadata into generation and updates the QA success message.

REPLACE  
src/utils/architecturalGuard.ts  
Refocuses guard instructions on product drift while allowing new camera and scene composition.
