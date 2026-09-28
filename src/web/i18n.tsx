import { createContext, useContext, useMemo, useState } from 'react';

export type Language = 'en' | 'uk';

const en = {
  synthetic: 'POC · Synthetic data only',
  simulated: 'Simulated analysis — demonstration only',
  language: 'Language', english: 'English', ukrainian: 'Українська',
  signOut: 'Sign out', retry: 'Try again', loading: 'Loading…',
  sessionChecking: 'Checking your session…', sessionExpired: 'Your session has expired. Sign in again.',
  unauthorized: 'Your account is not authorized.', serviceUnavailable: 'The service is temporarily unavailable. Try again.',
  signInRequired: 'Sign in to continue. Your session may have expired.', actionFailed: 'The action could not be completed. Try again.',
  workspaceTitle: 'Your demo workspace', demoSignIn: 'Demo account sign-in', demoSignInHelp: 'Choose a fictional account to explore the POC. No password is required.', seedAccounts: 'Seed the demo database to load test accounts.',
  clientWorkspace: 'Client workspace', managerWorkspace: 'Manager review', complianceWorkspace: 'Compliance review',
  casesDocuments: 'Cases and documents', assignedQueue: 'Assigned case queue',
  createCase: 'Create case', caseTitle: 'Case title', description: 'Description', amount: 'Amount', createDraft: 'Create draft', myCases: 'My cases', cases: 'Cases',
  noCasesClient: 'No cases yet. Create a draft to begin.', noCasesReview: 'Your assigned queue is empty.', selectCase: 'Select a case to see documents, messages and next actions.',
  currentState: 'Current state', nextAction: 'Next action', nextClientDraft: 'Upload the supplied documents, then submit the case.', nextClientCorrection: 'Read the bank request, upload the corrected document and resubmit.', nextClientWait: 'The bank is reviewing this case.', nextClientDone: 'The bank recorded its final decision.',
  nextManagerSubmitted: 'Start the formal manager review.', nextManagerReview: 'Complete every check for the current document versions.', nextManagerWait: 'Compliance or the client owns the next step.', nextComplianceReview: 'Review findings and record a human decision.', nextComplianceWait: 'The client or manager owns the next step.',
  create: 'Create', active: 'Active', awaitingClient: 'Awaiting client', completed: 'Completed', completedTurnaround: 'Completed turnaround', oldestActive: 'Oldest active case', hours: 'hours', noCompleted: 'No completed cases yet',
  notifications: 'Notifications', noNotifications: 'No notifications.', openCase: 'Open case',
  documents: 'Documents', uploadFixture: 'Upload supplied fixture', contract: 'Contract', invoice: 'Invoice', versions: 'Version history', download: 'Download', submitCase: 'Submit case', revision: 'revision',
  audit: 'Audit timeline', messages: 'Messages', noMessages: 'No messages yet.', noAudit: 'No audit events yet.', response: 'Response to the bank', addResponse: 'Add response',
  analysis: 'Simulated analysis', analysisHelp: 'Predefined fixture extraction for demonstration only. It cannot approve or reject a case.', runAnalysis: 'Run simulated analysis', historical: 'historical version', evidence: 'Evidence: fixture page', suggestedRequest: 'Approve and send suggested request', retryAnalysis: 'Retry analysis', noAnalysis: 'No analysis results yet.',
  analysisBadgeQueued: 'Analysis queued', analysisBadgeProcessing: 'Analyzing…', analysisBadgeCompleted: 'Already analyzed', analysisBadgeFailed: 'Analysis failed',
  startReview: 'Start manager review', checklist: 'Formal checks', forward: 'Forward to compliance', correctionRequest: 'Client-visible correction request', requestChanges: 'Request changes', reviewNote: 'Review note', internal: 'Internal', clientVisible: 'Client visible', addNote: 'Add note', approved: 'Approved', rejected: 'Rejected', decisionReason: 'Decision reason', recordDecision: 'Record final decision',
  documentsPresent: 'Documents present', fixturesReadable: 'Fixtures readable', partiesChecked: 'Parties checked', amountChecked: 'Amount and currency checked', datesChecked: 'Dates checked',
  stateDraft: 'Draft', stateSubmitted: 'Submitted', stateManagerReview: 'Manager review', stateComplianceReview: 'Compliance review', stateAwaitingClient: 'Awaiting client', stateApproved: 'Approved', stateRejected: 'Rejected',
  roleClient: 'client', roleManager: 'manager', roleCompliance: 'compliance', roleAdmin: 'administrator',
};

export type TranslationKey = keyof typeof en;
const uk: Record<TranslationKey, string> = {
  synthetic: 'POC · Лише синтетичні дані', simulated: 'Симульований аналіз — лише для демонстрації', language: 'Мова', english: 'English', ukrainian: 'Українська', signOut: 'Вийти', retry: 'Спробувати ще раз', loading: 'Завантаження…',
  sessionChecking: 'Перевіряємо сесію…', sessionExpired: 'Сесію завершено. Увійдіть знову.', unauthorized: 'Ваш обліковий запис не має доступу.', serviceUnavailable: 'Сервіс тимчасово недоступний. Спробуйте ще раз.', signInRequired: 'Увійдіть, щоб продовжити. Можливо, сесію завершено.', actionFailed: 'Не вдалося виконати дію. Спробуйте ще раз.',
  workspaceTitle: 'Ваше демонстраційне середовище', demoSignIn: 'Вхід до демо', demoSignInHelp: 'Оберіть вигаданий обліковий запис для перегляду POC. Пароль не потрібен.', seedAccounts: 'Заповніть демо-базу тестовими обліковими записами.',
  clientWorkspace: 'Кабінет клієнта', managerWorkspace: 'Перевірка менеджера', complianceWorkspace: 'Перевірка compliance', casesDocuments: 'Кейси та документи', assignedQueue: 'Черга призначених кейсів',
  createCase: 'Створити кейс', caseTitle: 'Назва кейсу', description: 'Опис', amount: 'Сума', createDraft: 'Створити чернетку', myCases: 'Мої кейси', cases: 'Кейси', noCasesClient: 'Кейсів ще немає. Створіть чернетку.', noCasesReview: 'Черга призначених кейсів порожня.', selectCase: 'Оберіть кейс, щоб переглянути документи, повідомлення та наступні дії.',
  currentState: 'Поточний стан', nextAction: 'Наступна дія', nextClientDraft: 'Завантажте надані документи та надішліть кейс.', nextClientCorrection: 'Прочитайте запит банку, завантажте виправлений документ і надішліть повторно.', nextClientWait: 'Банк перевіряє цей кейс.', nextClientDone: 'Банк зафіксував остаточне рішення.', nextManagerSubmitted: 'Почніть формальну перевірку менеджера.', nextManagerReview: 'Виконайте всі перевірки для поточних версій документів.', nextManagerWait: 'Наступний крок виконує compliance або клієнт.', nextComplianceReview: 'Перегляньте результати та зафіксуйте рішення людини.', nextComplianceWait: 'Наступний крок виконує клієнт або менеджер.',
  create: 'Створено', active: 'Активні', awaitingClient: 'Очікують клієнта', completed: 'Завершені', completedTurnaround: 'Час завершених перевірок', oldestActive: 'Найстаріший активний кейс', hours: 'год', noCompleted: 'Завершених кейсів ще немає',
  notifications: 'Сповіщення', noNotifications: 'Сповіщень немає.', openCase: 'Відкрити кейс', documents: 'Документи', uploadFixture: 'Завантажити наданий файл', contract: 'Контракт', invoice: 'Рахунок', versions: 'Історія версій', download: 'Завантажити', submitCase: 'Надіслати кейс', revision: 'ревізія', audit: 'Журнал аудиту', messages: 'Повідомлення', noMessages: 'Повідомлень ще немає.', noAudit: 'Подій аудиту ще немає.', response: 'Відповідь банку', addResponse: 'Додати відповідь',
  analysis: 'Симульований аналіз', analysisHelp: 'Наперед визначене вилучення даних із тестових файлів. Воно не може схвалити чи відхилити кейс.', runAnalysis: 'Запустити симульований аналіз', historical: 'історична версія', evidence: 'Джерело: сторінка тестового файла', suggestedRequest: 'Схвалити та надіслати запропонований запит', retryAnalysis: 'Повторити аналіз', noAnalysis: 'Результатів аналізу ще немає.',
  analysisBadgeQueued: 'Аналіз у черзі', analysisBadgeProcessing: 'Аналізуємо…', analysisBadgeCompleted: 'Вже проаналізовано', analysisBadgeFailed: 'Аналіз не вдався',
  startReview: 'Почати перевірку менеджера', checklist: 'Формальні перевірки', forward: 'Передати до compliance', correctionRequest: 'Запит на виправлення для клієнта', requestChanges: 'Запросити зміни', reviewNote: 'Нотатка перевірки', internal: 'Внутрішня', clientVisible: 'Видима клієнту', addNote: 'Додати нотатку', approved: 'Схвалено', rejected: 'Відхилено', decisionReason: 'Підстава рішення', recordDecision: 'Зафіксувати рішення',
  documentsPresent: 'Документи наявні', fixturesReadable: 'Файли читаються', partiesChecked: 'Сторони перевірено', amountChecked: 'Суму та валюту перевірено', datesChecked: 'Дати перевірено',
  stateDraft: 'Чернетка', stateSubmitted: 'Надіслано', stateManagerReview: 'Перевірка менеджера', stateComplianceReview: 'Перевірка compliance', stateAwaitingClient: 'Очікує клієнта', stateApproved: 'Схвалено', stateRejected: 'Відхилено', roleClient: 'клієнт', roleManager: 'менеджер', roleCompliance: 'compliance', roleAdmin: 'адміністратор',
};

export const translationCatalogs = { en, uk };
const I18nContext = createContext({ language: 'en' as Language, setLanguage: (_: Language) => {}, t: (key: TranslationKey) => en[key] });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => localStorage.getItem('dch-language') === 'uk' ? 'uk' : 'en');
  const value = useMemo(() => ({
    language,
    setLanguage(next: Language) { localStorage.setItem('dch-language', next); document.documentElement.lang = next; setLanguageState(next); },
    t(key: TranslationKey) { return translationCatalogs[language][key]; },
  }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

export function statusText(status: string, t: (key: TranslationKey) => string) {
  const key = `state${status}` as TranslationKey;
  return key in en ? t(key) : status;
}
