export function preparePublishCandidates({
  isPackagePublished,
  isVersionPublished,
  onPrepare,
  onSkip,
  packages,
  publishNewPackages,
  skipPublishedVersions = true,
}) {
  const candidates = packages.filter(({ packageJson }) => {
    const spec = `${packageJson.name}@${packageJson.version}`;

    if (skipPublishedVersions && isVersionPublished(spec)) {
      onSkip({ packageJson, reason: 'version-published', spec });
      return false;
    }

    if (!publishNewPackages && !isPackagePublished(packageJson.name)) {
      onSkip({ packageJson, reason: 'package-missing', spec });
      return false;
    }

    return true;
  });

  if (candidates.length > 0) {
    onPrepare();
  }

  return candidates;
}
