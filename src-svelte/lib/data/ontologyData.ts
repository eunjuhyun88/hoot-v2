/**
 * Ontology data model & branch catalog
 * — Defines the research blueprint structure for senior ML engineers
 */

// ─── Branch Type Catalog ───────────────────────────────────────

export type BranchTypeId =
  | 'model_architecture'
  | 'feature_engineering'
  | 'ensemble_methods'
  | 'regularization'
  | 'hyperparameter_tuning'
  | 'data_preprocessing'
  | 'custom';

export interface ModelOption {
  id: string;
  label: string;
  description: string;
}

export interface FeatureCategory {
  id: string;
  label: string;
  description: string;
}

export interface BranchTypeDefinition {
  id: BranchTypeId;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  icon: string;
  defaultIters: number;
  /** Available model options (model_architecture) */
  models?: ModelOption[];
  /** Available feature categories (feature_engineering) */
  featureCategories?: FeatureCategory[];
  /** Available strategies (ensemble_methods) */
  strategies?: string[];
  /** Available optimizers (hyperparameter_tuning) */
  optimizers?: string[];
  /** Available transforms (data_preprocessing) */
  transforms?: string[];
  /** Available methods (regularization) */
  methods?: string[];
}

export const BRANCH_CATALOG: BranchTypeDefinition[] = [
  {
    id: 'model_architecture',
    label: 'Model Architecture',
    shortLabel: 'Architecture',
    description: 'Compare classifiers and select best 2-3 for downstream ensembling',
    color: '#4A90D9',
    icon: '⊞',
    defaultIters: 25,
    models: [
      { id: 'xgboost', label: 'XGBoost', description: 'Gradient boosted trees' },
      { id: 'lightgbm', label: 'LightGBM', description: 'Fast gradient boosting' },
      { id: 'catboost', label: 'CatBoost', description: 'Categorical-aware boosting' },
      { id: 'extratrees', label: 'ExtraTrees', description: 'Extremely randomized trees' },
      { id: 'logistic', label: 'LogisticRegression', description: 'Linear baseline with L1/L2' },
      { id: 'randomforest', label: 'RandomForest', description: 'Bagging ensemble of trees' },
      { id: 'mlp', label: 'MLP', description: 'Small neural network classifier' },
    ],
  },
  {
    id: 'feature_engineering',
    label: 'Feature Engineering',
    shortLabel: 'Features',
    description: 'Engineer domain-specific features from raw data',
    color: '#27864a',
    icon: '◈',
    defaultIters: 50,
    featureCategories: [
      { id: 'momentum', label: 'Momentum', description: 'Rolling mean/std returns, RSI, MACD' },
      { id: 'volume', label: 'Volume', description: 'Volume ratio, volume-price confirmation' },
      { id: 'volatility', label: 'Volatility', description: 'Bollinger %B, ATR, volatility windows' },
      { id: 'sentiment', label: 'Sentiment', description: 'Lagged sentiment/funding rate' },
      { id: 'onchain', label: 'On-chain', description: 'On-chain ratio, OI/volume, whale flows' },
      { id: 'temporal', label: 'Temporal', description: 'Day sin/cos, trend fraction, lag diffs' },
    ],
  },
  {
    id: 'ensemble_methods',
    label: 'Ensemble Methods',
    shortLabel: 'Ensemble',
    description: 'Build composite models from best individual learners',
    color: '#D97757',
    icon: '⊕',
    defaultIters: 18,
    strategies: ['stacking', 'voting', 'blending', 'greedy_median'],
  },
  {
    id: 'regularization',
    label: 'Regularization',
    shortLabel: 'Regularization',
    description: 'Feature selection and noise reduction via regularization',
    color: '#8e44ad',
    icon: '◇',
    defaultIters: 5,
    methods: ['l1', 'l2', 'elastic_net', 'mutual_information', 'permutation_importance', 'smote'],
  },
  {
    id: 'hyperparameter_tuning',
    label: 'Hyperparameter Tuning',
    shortLabel: 'HP Tuning',
    description: 'Bayesian optimization over model hyperparameters',
    color: '#d4a017',
    icon: '⚙',
    defaultIters: 7,
    optimizers: ['optuna', 'grid', 'random'],
  },
  {
    id: 'data_preprocessing',
    label: 'Data Preprocessing',
    shortLabel: 'Preprocessing',
    description: 'Scaling, transforms, outlier handling, and feature binning',
    color: '#2c8c99',
    icon: '▤',
    defaultIters: 9,
    transforms: ['robust_scaling', 'yeo_johnson', 'kalman_smoothing', 'winsorize', 'binning', 'standard_scaler'],
  },
];

export function getBranchType(id: BranchTypeId): BranchTypeDefinition | undefined {
  return BRANCH_CATALOG.find(b => b.id === id);
}

// ─── Ontology Data Model ───────────────────────────────────────

export type ValidationStrategy = 'holdout' | 'kfold' | 'purged_cv' | 'stratified_kfold';
export type DataSource = 'auto' | 'csv' | 'instructions';
export type OntologyVisibility = 'private' | 'public';

export interface OntologyBranch {
  type: BranchTypeId;
  enabled: boolean;
  iters: number;
  /** Selected model IDs (model_architecture) */
  selectedModels?: string[];
  /** Selected feature categories (feature_engineering) */
  selectedCategories?: string[];
  /** Selected strategies (ensemble_methods) */
  selectedStrategies?: string[];
  /** Selected optimizer (hyperparameter_tuning) */
  selectedOptimizer?: string;
  /** Selected methods (regularization) */
  selectedMethods?: string[];
  /** Selected transforms (data_preprocessing) */
  selectedTransforms?: string[];
  /** Custom prompt for custom branch */
  customPrompt?: string;
}

export interface ForkSource {
  type: 'job' | 'model' | 'ontology';
  id: string;
  name: string;
  bestMetric?: number;
  branchResults?: { type: BranchTypeId; metric: number; iters: number; keeps: number }[];
}

export interface OntologyEvaluation {
  metric: string;
  direction: 'maximize' | 'minimize';
  target: number;
  completionMode: 'target' | 'all';
  validationStrategy: ValidationStrategy;
  customEvalScript?: string;
}

export interface OntologyDataConfig {
  source: DataSource;
  csvFile?: File;
  csvPreview?: { columns: string[]; rows: string[][]; totalRows: number };
  instructions?: string;
  parentDatasetRef?: string;
}

export interface OntologyResources {
  budgetHoot?: number;
  gpuTier: 1 | 2 | 3;
  maxTimeMinutes?: number;
  trainingSeed?: number;
  deterministic: boolean;
}

export interface ResearchOntology {
  id: string;
  name: string;
  description: string;
  tags: string[];
  forkedFrom?: ForkSource;
  branches: OntologyBranch[];
  evaluation: OntologyEvaluation;
  data: OntologyDataConfig;
  resources: OntologyResources;
  visibility: OntologyVisibility;
  createdAt: string;
  version: number;
}

// ─── Presets ───────────────────────────────────────────────────

export interface OntologyPreset {
  id: string;
  label: string;
  name: string;
  description: string;
  tags: string[];
  branches: OntologyBranch[];
  evaluation: Partial<OntologyEvaluation>;
}

function defaultBranch(type: BranchTypeId, overrides?: Partial<OntologyBranch>): OntologyBranch {
  const def = getBranchType(type);
  return {
    type,
    enabled: true,
    iters: def?.defaultIters ?? 50,
    ...overrides,
  };
}

export const ONTOLOGY_PRESETS: OntologyPreset[] = [
  {
    id: 'crypto_market',
    label: 'Crypto Market Prediction',
    name: 'Crypto Market Prediction',
    description: 'Predict short-term cryptocurrency price movements using on-chain metrics, market data, and sentiment indicators',
    tags: ['crypto', 'market', 'prediction'],
    branches: [
      defaultBranch('model_architecture', { selectedModels: ['xgboost', 'lightgbm', 'catboost', 'extratrees', 'logistic'] }),
      defaultBranch('feature_engineering', { selectedCategories: ['momentum', 'volume', 'volatility', 'sentiment', 'onchain', 'temporal'] }),
      defaultBranch('ensemble_methods', { selectedStrategies: ['stacking', 'voting', 'greedy_median'] }),
      defaultBranch('regularization', { selectedMethods: ['l1', 'l2', 'mutual_information', 'permutation_importance'] }),
      defaultBranch('hyperparameter_tuning', { selectedOptimizer: 'optuna' }),
      defaultBranch('data_preprocessing', { selectedTransforms: ['robust_scaling', 'yeo_johnson', 'kalman_smoothing', 'winsorize'] }),
    ],
    evaluation: { metric: 'bal_acc', direction: 'maximize', target: 0.7 },
  },
  {
    id: 'defi_risk',
    label: 'DeFi Protocol Risk',
    name: 'DeFi Protocol Risk',
    description: 'Classify DeFi protocols by risk level using TVL dynamics, audit history, and token economics',
    tags: ['defi', 'risk', 'classification'],
    branches: [
      defaultBranch('model_architecture', { selectedModels: ['xgboost', 'lightgbm', 'randomforest'] }),
      defaultBranch('feature_engineering', { selectedCategories: ['onchain', 'temporal'] }),
      defaultBranch('ensemble_methods', { selectedStrategies: ['stacking', 'voting'] }),
      defaultBranch('regularization', { selectedMethods: ['l1', 'l2', 'smote'] }),
      defaultBranch('hyperparameter_tuning', { selectedOptimizer: 'optuna' }),
      defaultBranch('data_preprocessing', { selectedTransforms: ['robust_scaling', 'standard_scaler', 'binning'] }),
    ],
    evaluation: { metric: 'bal_acc', direction: 'maximize', target: 0.75 },
  },
  {
    id: 'fraud_detection',
    label: 'Fraud Detection',
    name: 'Fraud Detection',
    description: 'Identify fraudulent transactions using transaction patterns, network analysis, and behavioral features',
    tags: ['fraud', 'detection', 'security'],
    branches: [
      defaultBranch('model_architecture', { selectedModels: ['xgboost', 'lightgbm', 'catboost', 'mlp'] }),
      defaultBranch('feature_engineering', { selectedCategories: ['temporal'] }),
      defaultBranch('ensemble_methods', { selectedStrategies: ['stacking', 'blending'] }),
      defaultBranch('regularization', { selectedMethods: ['smote', 'l1', 'permutation_importance'] }),
      defaultBranch('hyperparameter_tuning', { selectedOptimizer: 'optuna' }),
      defaultBranch('data_preprocessing', { selectedTransforms: ['robust_scaling', 'winsorize', 'binning'] }),
    ],
    evaluation: { metric: 'f1', direction: 'maximize', target: 0.8 },
  },
  {
    id: 'time_series',
    label: 'Time Series Forecasting',
    name: 'Time Series Forecasting',
    description: 'General time series prediction with trend decomposition, seasonality, and external regressors',
    tags: ['timeseries', 'forecasting'],
    branches: [
      defaultBranch('model_architecture', { selectedModels: ['xgboost', 'lightgbm', 'extratrees'] }),
      defaultBranch('feature_engineering', { selectedCategories: ['momentum', 'temporal'] }),
      defaultBranch('ensemble_methods', { selectedStrategies: ['stacking', 'greedy_median'] }),
      defaultBranch('regularization', { selectedMethods: ['l1', 'elastic_net'] }),
      defaultBranch('hyperparameter_tuning', { selectedOptimizer: 'optuna' }),
      defaultBranch('data_preprocessing', { selectedTransforms: ['yeo_johnson', 'kalman_smoothing', 'standard_scaler'] }),
    ],
    evaluation: { metric: 'rmse', direction: 'minimize', target: 0.1 },
  },
];

// ─── Factory ───────────────────────────────────────────────────

export function createEmptyOntology(): ResearchOntology {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    tags: [],
    branches: BRANCH_CATALOG.map(b => defaultBranch(b.id)),
    evaluation: {
      metric: 'bal_acc',
      direction: 'maximize',
      target: 0.7,
      completionMode: 'target',
      validationStrategy: 'holdout',
    },
    data: { source: 'auto' },
    resources: {
      gpuTier: 1,
      deterministic: false,
    },
    visibility: 'private',
    createdAt: new Date().toISOString(),
    version: 1,
  };
}

export function createOntologyFromPreset(presetId: string): ResearchOntology {
  const preset = ONTOLOGY_PRESETS.find(p => p.id === presetId);
  if (!preset) return createEmptyOntology();

  const ont = createEmptyOntology();
  ont.name = preset.name;
  ont.description = preset.description;
  ont.tags = [...preset.tags];
  ont.branches = [...preset.branches];
  if (preset.evaluation.metric) ont.evaluation.metric = preset.evaluation.metric;
  if (preset.evaluation.direction) ont.evaluation.direction = preset.evaluation.direction;
  if (preset.evaluation.target !== undefined) ont.evaluation.target = preset.evaluation.target;
  return ont;
}

export function createOntologyFromFork(source: ForkSource): ResearchOntology {
  const ont = createEmptyOntology();
  ont.name = `${source.name} (fork)`;
  ont.forkedFrom = source;
  if (source.branchResults) {
    ont.branches = source.branchResults.map(br => defaultBranch(br.type, { iters: br.iters }));
  }
  return ont;
}

// ─── Computed helpers ──────────────────────────────────────────

export function getEnabledBranches(ont: ResearchOntology): OntologyBranch[] {
  return ont.branches.filter(b => b.enabled);
}

export function getTotalExperiments(ont: ResearchOntology): number {
  return getEnabledBranches(ont).reduce((sum, b) => sum + b.iters, 0);
}

export function estimateBudgetHoot(ont: ResearchOntology): number {
  const total = getTotalExperiments(ont);
  // $0.09/run at non-staking, ~0.9 HOOT/run at TGE $0.10
  return Math.ceil(total * 0.9);
}
