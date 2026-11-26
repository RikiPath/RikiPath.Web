// Japanese dictionaries, looked up in order after the core `ui.ja` table in locale.js.
// Add new screens as new modules here (one area per file) — never duplicate a key across modules.
import { jaAppCore } from './appCore.js';
import { jaErrors } from './errors.js';
import { jaLanding } from './landing.js';
import { jaWorkspace } from './workspace.js';
import { jaGroupLearning } from './groupLearning.js';
import { jaCourses } from './courses.js';
import { jaMentor } from './mentor.js';
import { jaAdmin } from './admin.js';
import { jaAuthor } from './author.js';
import { jaPublicPages } from './publicPages.js';
import { jaLearnerScreens } from './learnerScreens.js';
import { jaTemplates } from './templates.js';
import { jaAccountProfile } from './accountProfile.js';
import { jaWorkspaceV7 } from './workspaceV7.js';
import { jaTeachingProposals } from './teachingProposals.js';
import { jaSrsV41 } from './srsV41.js';
import { jaNotebookV3 } from './notebookV3.js';
import { jaLearningMoments } from './learningMoments.js';
import { jaPaymentFlow } from './paymentFlow.js';
import { jaPlanManagement } from './planManagement.js';
import { jaGrammarBank } from './grammarBank.js';
import { jaSrsV5 } from './srsV5.js';
import { jaLearningJourney } from './learningJourney.js';
import { jaSidebarCounters } from './sidebarCounters.js';
import { jaTerminology } from './terminology.js';
import { jaLearnerSetup } from './learnerSetup.js';

export const JA_DICTIONARIES = [jaAppCore, jaErrors, jaLanding, jaWorkspace, jaGroupLearning, jaCourses, jaMentor, jaAdmin, jaAuthor, jaPublicPages, jaLearnerScreens, jaTemplates, jaAccountProfile, jaWorkspaceV7, jaTeachingProposals, jaSrsV41, jaNotebookV3, jaSrsV5, jaLearningMoments, jaPaymentFlow, jaPlanManagement, jaGrammarBank, jaLearningJourney, jaSidebarCounters, jaTerminology, jaLearnerSetup];
