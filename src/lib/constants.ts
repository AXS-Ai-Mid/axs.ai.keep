import type { Priority, Repeat, StageId } from '../types'

export interface StageDef {
  id: StageId
  name: string
  short: string
  color: ColorKeyList
  accent: string
  soft: string
  description: string
}

type ColorKeyList = string

/** As 6 etapas exatas do fluxo de atendimento da empresa. */
export const STAGES: StageDef[] = [
  { id: 'prospeccao', name: 'Prospecção', short: 'Prospecção', color: 'azul', accent: '#2563eb', soft: '#dbeafe', description: 'Leads captados e ainda sem contato qualificado' },
  { id: 'atendimento', name: '1º Atendimento', short: '1º Atend.', color: 'ciano', accent: '#0d9488', soft: '#ccfbf1', description: 'Primeiro contato, diagnóstico e levantamento de dor' },
  { id: 'criacao', name: 'Criação', short: 'Criação', color: 'violeta', accent: '#7c3aed', soft: '#ede9fe', description: 'Desenvolvimento da solução / proposta técnica' },
  { id: 'apresentacao', name: 'Apresentação', short: 'Apresent.', color: 'ambar', accent: '#d97706', soft: '#fef3c7', description: 'Demonstração, proposta comercial e negociação' },
  { id: 'venda', name: 'Venda', short: 'Venda', color: 'esmeralda', accent: '#059669', soft: '#d1fae5', description: 'Contrato em assinatura e condições acertadas' },
  { id: 'fechamento', name: 'Fechamento', short: 'Fecham.', color: 'turquesa', accent: '#0f766e', soft: '#cffafe', description: 'Contrato fechado, implantação e pós-venda' },
]

export const STAGE_MAP = STAGES.reduce<Record<StageId, StageDef>>((acc, stage) => {
  acc[stage.id] = stage
  return acc
}, {} as Record<StageId, StageDef>)

export interface PriorityDef {
  id: Priority
  label: string
  dot: string
  chip: string
  ring: string
}

export const PRIORITIES: PriorityDef[] = [
  { id: 'baixa', label: 'Baixa', dot: '#64748b', chip: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300', ring: 'ring-slate-300' },
  { id: 'media', label: 'Média', dot: '#2563eb', chip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300', ring: 'ring-blue-300' },
  { id: 'alta', label: 'Alta', dot: '#d97706', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', ring: 'ring-amber-300' },
  { id: 'urgente', label: 'Urgente', dot: '#dc2626', chip: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300', ring: 'ring-red-300' },
]

export const PRIORITY_MAP = PRIORITIES.reduce<Record<Priority, PriorityDef>>((acc, item) => {
  acc[item.id] = item
  return acc
}, {} as Record<Priority, PriorityDef>)

export const REPEAT_LABEL: Record<Repeat, string> = {
  none: 'Não repete',
  daily: 'Diariamente',
  weekly: 'Semanalmente',
  monthly: 'Mensalmente',
}

export const STORAGE_KEYS = {
  filters: 'crmnotes.filters.v1',
}
