import type { AdmissionExamQuestion } from '@/lib/usis-api'

export const SAMPLE_ENTRANCE_EXAM_BANK: AdmissionExamQuestion[] = [
  {
    id: 'stem-1',
    prompt: 'What is the value of 7 × 8?',
    choices: ['54', '56', '63', '64'],
    correctIndex: 1,
    strandTag: 'STEM',
  },
  {
    id: 'stem-2',
    prompt: 'Which device is primarily used to store permanent computer programs and data?',
    choices: ['RAM', 'CPU', 'Hard disk / SSD', 'Monitor'],
    correctIndex: 2,
    strandTag: 'STEM',
  },
  {
    id: 'stem-3',
    prompt: 'Water boils at approximately what temperature at sea level?',
    choices: ['0°C', '50°C', '100°C', '212°C only in Celsius'],
    correctIndex: 2,
    strandTag: 'STEM',
  },
  {
    id: 'abm-1',
    prompt: 'Profit is best described as…',
    choices: ['Total assets', 'Revenue minus expenses', 'Owner’s capital only', 'Cash in bank'],
    correctIndex: 1,
    strandTag: 'ABM',
  },
  {
    id: 'abm-2',
    prompt:
      'Which document typically records daily sales and cash collections for a small business?',
    choices: ['Birth certificate', 'Cash receipt / sales record', 'Class schedule', 'Library card'],
    correctIndex: 1,
    strandTag: 'ABM',
  },
  {
    id: 'abm-3',
    prompt: 'Marketing mainly focuses on…',
    choices: [
      'Creating and delivering value to customers',
      'Only hiring employees',
      'Only computing taxes',
      'Only repairing equipment',
    ],
    correctIndex: 0,
    strandTag: 'ABM',
  },
  {
    id: 'humss-1',
    prompt: 'Psychology is best described as the study of…',
    choices: [
      'Rocks and minerals',
      'Behavior and mental processes',
      'Tax ledgers',
      'Circuit boards',
    ],
    correctIndex: 1,
    strandTag: 'HUMSS',
  },
  {
    id: 'humss-2',
    prompt: 'Freedom of expression is most closely associated with which field?',
    choices: [
      'Civil engineering',
      'Communication / journalism',
      'Accountancy',
      'Veterinary science',
    ],
    correctIndex: 1,
    strandTag: 'HUMSS',
  },
  {
    id: 'humss-3',
    prompt: 'A law that governs relationships among people in a community is an example of…',
    choices: ['Social / legal norms', 'Chemical bonding', 'Hardware firmware', 'Inventory SKU'],
    correctIndex: 0,
    strandTag: 'HUMSS',
  },
  {
    id: 'gas-1',
    prompt: 'Critical thinking means…',
    choices: [
      'Accepting every claim without evidence',
      'Analyzing information carefully before deciding',
      'Memorizing only formulas',
      'Avoiding all reading',
    ],
    correctIndex: 1,
    strandTag: 'GAS',
  },
  {
    id: 'gas-2',
    prompt: 'Which skill helps across many college programs?',
    choices: [
      'Clear written communication',
      'Ignoring deadlines',
      'Never asking questions',
      'Avoiding teamwork',
    ],
    correctIndex: 0,
    strandTag: 'GAS',
  },
  {
    id: 'gen-1',
    prompt: 'WMSU is a…',
    choices: [
      'state university',
      'private elementary school only',
      'hospital chain',
      'telecom provider',
    ],
    correctIndex: 0,
    strandTag: 'general',
  },
]

export const SAMPLE_ENTRANCE_EXAM_CSV = `id,prompt,choiceA,choiceB,choiceC,choiceD,correctIndex,strandTag
stem-1,What is the value of 7 × 8?,54,56,63,64,1,STEM
stem-2,Which stores permanent computer programs and data?,RAM,CPU,Hard disk / SSD,Monitor,2,STEM
abm-1,Profit is best described as…,Total assets,Revenue minus expenses,Owner capital only,Cash in bank,1,ABM
humss-1,Psychology is the study of…,Rocks,Behavior and mental processes,Tax ledgers,Circuits,1,HUMSS
gas-1,Critical thinking means…,Accept every claim,Analyze information carefully,Memorize only,Avoid reading,1,GAS
`
