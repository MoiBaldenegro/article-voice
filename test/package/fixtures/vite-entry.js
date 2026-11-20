import { createCore, DomainError } from 'article-voice';
window.__result = { core: typeof createCore(), hasError: typeof DomainError };
