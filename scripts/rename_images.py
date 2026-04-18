import argparse
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")

DOSSIER_RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "birds"))


def is_jpg(filename):
    return filename.lower().endswith(".jpg")


def normalize_case_to_image_jpg(root, current_name, dry_run):
    src = os.path.join(root, current_name)
    dst = os.path.join(root, "image.jpg")

    # On Windows, renaming only by case needs an intermediate name.
    temp = os.path.join(root, "__tmp_image_case_fix__.jpg")

    if dry_run:
        print(f"DRY-RUN CASE {src} -> {dst}")
        return True

    os.replace(src, temp)
    os.replace(temp, dst)
    print(f"OK CASE FIX: {dst}")
    return True


def process_folder(root, files, dry_run):
    jpg_files = sorted([f for f in files if is_jpg(f)])
    if not jpg_files:
        return 0, 0, 0, 0

    renamed = 0
    skipped = 0
    warnings = 0
    errors = 0

    target_exact_exists = "image.jpg" in jpg_files
    target_any_case = next((f for f in jpg_files if f.lower() == "image.jpg"), None)

    # Already has image.jpg, leave other jpg files untouched (manual decision)
    if target_exact_exists:
        extras = [f for f in jpg_files if f != "image.jpg"]
        if extras:
            warnings += 1
            print(f"WARN {root}: image.jpg exists + other JPG files: {extras}")
        else:
            skipped += 1
            print(f"SKIP {root}: already image.jpg")
        return renamed, skipped, warnings, errors

    # Has Image.JPG / IMAGE.jpg etc: normalize case.
    if target_any_case is not None:
        try:
            if normalize_case_to_image_jpg(root, target_any_case, dry_run):
                renamed += 1
        except Exception as exc:
            errors += 1
            print(f"ERROR {root}: cannot normalize case for {target_any_case}: {exc}")
        extras = [f for f in jpg_files if f != target_any_case]
        if extras:
            warnings += 1
            print(f"WARN {root}: renamed case but other JPG files remain: {extras}")
        return renamed, skipped, warnings, errors

    # No image.jpg at all.
    if len(jpg_files) > 1:
        warnings += 1
        print(f"WARN {root}: multiple JPG files found, skipped to avoid bad rename: {jpg_files}")
        return renamed, skipped, warnings, errors

    src_name = jpg_files[0]
    src = os.path.join(root, src_name)
    dst = os.path.join(root, "image.jpg")

    try:
        if dry_run:
            print(f"DRY-RUN RENAME {src} -> {dst}")
        else:
            os.replace(src, dst)
            print(f"OK RENAMED: {src_name} -> image.jpg ({root})")
        renamed += 1
    except Exception as exc:
        errors += 1
        print(f"ERROR {root}: cannot rename {src_name} -> image.jpg: {exc}")

    return renamed, skipped, warnings, errors


def main():
    parser = argparse.ArgumentParser(
        description="Parcourt birds/ et renomme les .jpg en image.jpg si necessaire."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Affiche les actions sans modifier les fichiers.",
    )
    args = parser.parse_args()

    print(f"INFO Starting folder scan: {DOSSIER_RACINE}")
    if args.dry_run:
        print("INFO Dry-run mode enabled")

    total_renamed = 0
    total_skipped = 0
    total_warnings = 0
    total_errors = 0

    for root, _, files in os.walk(DOSSIER_RACINE):
        renamed, skipped, warnings, errors = process_folder(root, files, args.dry_run)
        total_renamed += renamed
        total_skipped += skipped
        total_warnings += warnings
        total_errors += errors

    print("INFO Summary")
    print(f"- Renamed: {total_renamed}")
    print(f"- Skipped: {total_skipped}")
    print(f"- Warnings: {total_warnings}")
    print(f"- Errors: {total_errors}")

    if total_errors > 0:
        print("ERROR Done with errors.")
        sys.exit(1)

    print("OK Done.")


if __name__ == "__main__":
    main()
