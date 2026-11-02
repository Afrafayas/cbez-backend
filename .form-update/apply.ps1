$ErrorActionPreference = 'Stop'
$taskStage = $PSScriptRoot
$taskParent = Split-Path (Split-Path $taskStage -Parent) -Parent
foreach ($taskApp in @('cbez-admin', 'cbez-frontend')) {
  $taskTargetRoot = [IO.Path]::GetFullPath((Join-Path $taskParent $taskApp))
  $taskOriginal = Join-Path $taskStage "$taskApp.original.tsx"
  $taskCurrent = Join-Path $taskTargetRoot 'src/components/AddEditProductModal.tsx'
  if ([IO.File]::ReadAllText($taskOriginal) -cne [IO.File]::ReadAllText($taskCurrent)) {
    throw "The $taskApp form changed after preparation; refusing to overwrite it."
  }
  $taskFiles = @('components/AddEditProductModal.tsx', 'components/SearchableSelect.tsx', 'components/AdditionalSpecifications.tsx', 'utils/productFormOptions.ts', 'utils/categorySpecifications.ts')
  if ($taskApp -eq 'cbez-frontend') { $taskFiles += 'types.ts' }
  foreach ($taskFile in $taskFiles) {
    $taskDestination = [IO.Path]::GetFullPath((Join-Path $taskTargetRoot "src/$taskFile"))
    if (-not $taskDestination.StartsWith($taskTargetRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid destination' }
    if (($taskFile -ne 'components/AddEditProductModal.tsx') -and ($taskFile -ne 'types.ts') -and (Test-Path -LiteralPath $taskDestination)) { throw "New file already exists: $taskDestination" }
  }
}
foreach ($taskApp in @('cbez-admin', 'cbez-frontend')) {
  $taskTargetRoot = [IO.Path]::GetFullPath((Join-Path $taskParent $taskApp))
  $taskFiles = @('components/AddEditProductModal.tsx', 'components/SearchableSelect.tsx', 'components/AdditionalSpecifications.tsx', 'utils/productFormOptions.ts', 'utils/categorySpecifications.ts')
  if ($taskApp -eq 'cbez-frontend') { $taskFiles += 'types.ts' }
  foreach ($taskFile in $taskFiles) {
    $taskDestination = Join-Path $taskTargetRoot "src/$taskFile"
    [IO.Directory]::CreateDirectory((Split-Path $taskDestination -Parent)) | Out-Null
    [IO.File]::Copy((Join-Path $taskStage "$taskApp/src/$taskFile"), $taskDestination, $true)
    Write-Output "Updated $taskApp/src/$taskFile"
  }
}
