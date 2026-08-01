#!/bin/bash

# Code Replacer Script for Termux
# Usage: ./code_replacer.sh "old_code" "new_code" [file_extensions]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo -e "  $0 \"old_code\" \"new_code\" [file_extensions]"
    echo -e "  $0 -f old_code_file new_code_file [file_extensions]"
    echo -e ""
    echo -e "${BLUE}Examples:${NC}"
    echo -e "  $0 \"old_function()\" \"new_function()\""
    echo -e "  $0 \"color: red;\" \"color: blue;\" \"css,html\""
    echo -e "  $0 -f old_code.txt new_code.txt \"java,css,html\""
    echo -e ""
    echo -e "${BLUE}Note:${NC} If file extensions are not specified, searches all text-based files"
}

# Function to read code from file
read_code_from_file() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        echo -e "${RED}Error: File '$file' not found${NC}"
        exit 1
    fi
    # Use base64 to preserve special characters and formatting
    cat "$file" | base64
}

# Function to decode base64 code
decode_code() {
    echo "$1" | base64 -d
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Validate arguments
if [[ $# -lt 2 ]]; then
    echo -e "${RED}Error: Insufficient arguments${NC}"
    usage
    exit 1
fi

# Initialize variables
OLD_CODE=""
NEW_CODE=""
FILE_EXTENSIONS=""
USE_FILES=false

# Parse arguments
if [[ "$1" == "-f" ]]; then
    USE_FILES=true
    if [[ $# -lt 3 ]]; then
        echo -e "${RED}Error: Insufficient arguments for file mode${NC}"
        usage
        exit 1
    fi
    OLD_CODE_FILE="$2"
    NEW_CODE_FILE="$3"
    FILE_EXTENSIONS="${4:-}"
    
    echo -e "${BLUE}Reading old code from file: $OLD_CODE_FILE${NC}"
    OLD_CODE=$(read_code_from_file "$OLD_CODE_FILE")
    echo -e "${BLUE}Reading new code from file: $NEW_CODE_FILE${NC}"
    NEW_CODE=$(read_code_from_file "$NEW_CODE_FILE")
else
    OLD_CODE="$1"
    NEW_CODE="$2"
    FILE_EXTENSIONS="${3:-}"
    # Encode the direct input code as well to handle special characters
    OLD_CODE=$(echo "$OLD_CODE" | base64)
    NEW_CODE=$(echo "$NEW_CODE" | base64)
fi

# Create file pattern for find command
if [[ -n "$FILE_EXTENSIONS" ]]; then
    IFS=',' read -ra EXT_ARRAY <<< "$FILE_EXTENSIONS"
    FIND_PATTERN=""
    for ext in "${EXT_ARRAY[@]}"; do
        ext=$(echo "$ext" | sed 's/^[ \t]*//;s/[ \t]*$//') # trim spaces
        if [[ -n "$FIND_PATTERN" ]]; then
            FIND_PATTERN="$FIND_PATTERN -o"
        fi
        FIND_PATTERN="$FIND_PATTERN -name \"*.$ext\""
    done
    FIND_CMD="find . -type f \( $FIND_PATTERN \)"
else
    # Search common text-based files if no extensions specified
    FIND_CMD="find . -type f \( -name \"*.java\" -o -name \"*.css\" -o -name \"*.html\" -o -name \"*.js\" -o -name \"*.txt\" -o -name \"*.xml\" -o -name \"*.json\" -o -name \"*.php\" -o -name \"*.py\" -o -name \"*.md\" \)"
fi

echo -e "${YELLOW}Starting code replacement...${NC}"
echo -e "${BLUE}Searching for files...${NC}"

# Count total files
TOTAL_FILES=$(eval "$FIND_CMD" | wc -l)
echo -e "${BLUE}Found $TOTAL_FILES files to check${NC}"

# Counter for modified files
MODIFIED_COUNT=0
CHECKED_COUNT=0

# Process files
while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    
    CHECKED_COUNT=$((CHECKED_COUNT + 1))
    echo -e "\n${BLUE}Checking file $CHECKED_COUNT/$TOTAL_FILES: $file${NC}"
    
    # Check if file contains the exact old code
    OLD_CONTENT=$(decode_code "$OLD_CODE")
    if grep -q -F -- "$OLD_CONTENT" "$file"; then
        echo -e "${GREEN}Found exact match in: $file${NC}"
        
        # Create backup
        BACKUP_FILE="${file}.backup.$(date +%Y%m%d%H%M%S)"
        cp "$file" "$BACKUP_FILE"
        echo -e "${YELLOW}Backup created: $BACKUP_FILE${NC}"
        
        # Perform replacement
        NEW_CONTENT=$(decode_code "$NEW_CODE")
        
        # Use awk for safer multi-line replacement
        awk -v old="$OLD_CONTENT" -v new="$NEW_CONTENT" '
        BEGIN { found=0 }
        index($0, old) {
            found=1
            print new
            next
        }
        { print }
        END { if (found) print "Replacement completed" > "/dev/stderr" }
        ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
        
        # Verify replacement
        if grep -q -F -- "$NEW_CONTENT" "$file" && ! grep -q -F -- "$OLD_CONTENT" "$file"; then
            echo -e "${GREEN}Successfully replaced code in: $file${NC}"
            MODIFIED_COUNT=$((MODIFIED_COUNT + 1))
        else
            echo -e "${RED}Replacement verification failed for: $file${NC}"
            echo -e "${YELLOW}Restoring from backup...${NC}"
            cp "$BACKUP_FILE" "$file"
            rm "$BACKUP_FILE"
        fi
    else
        echo -e "${YELLOW}No exact match found in: $file${NC}"
    fi
    
done < <(eval "$FIND_CMD")

# Summary
echo -e "\n${GREEN}=== Replacement Summary ===${NC}"
echo -e "${BLUE}Files checked: $CHECKED_COUNT${NC}"
echo -e "${GREEN}Files modified: $MODIFIED_COUNT${NC}"

if [[ $MODIFIED_COUNT -eq 0 ]]; then
    echo -e "${YELLOW}No files were modified. Check if the old code exists exactly as provided.${NC}"
fi

echo -e "\n${GREEN}Done!${NC}"
