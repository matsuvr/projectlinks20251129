import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
  ...nextCoreWebVitals,
  {
    name: 'project-ignores',
    ignores: [
      'coast-line/**',
      'souko_data/**',
      'station-data/**',
      'stations.duckdb*',
    ],
  },
]

export default config
