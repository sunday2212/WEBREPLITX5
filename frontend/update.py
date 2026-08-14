import os
import json

BASE_DIR = os.path.expanduser("~/readme-mojo2/1234xx")
MANIFEST_FILE = os.path.join(BASE_DIR, "manifest.json")

output = []

# Loop through each PLATFORM folder inside 1234xx
for platform in sorted(os.listdir(BASE_DIR)):
    platform_path = os.path.join(BASE_DIR, platform)

    # Skip manifest.json itself
    if platform == "manifest.json":
        continue

    if os.path.isdir(platform_path):

        # If platform has NO subfolders, treat as 'non'
        files_in_platform = [
            f for f in os.listdir(platform_path)
            if f.endswith(".json")
        ]

        if files_in_platform:
            output.append({
                "platform": platform,
                "subfolder": "non",
                "files": sorted(files_in_platform)
            })

        # If platform contains subfolders
        for sub in sorted(os.listdir(platform_path)):
            sub_path = os.path.join(platform_path, sub)

            if os.path.isdir(sub_path):
                json_files = [
                    f for f in os.listdir(sub_path)
                    if f.endswith(".json")
                ]

                if json_files:
                    output.append({
                        "platform": platform,
                        "subfolder": sub,
                        "files": sorted(json_files)
                    })

# Write result to manifest.json
with open(MANIFEST_FILE, "w") as mf:
    json.dump(output, mf, indent=2)

print("\nmanifest.json updated successfully!")
print(f"Total entries: {len(output)}")
