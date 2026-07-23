# Nexora AI Complete Frontend Audit

## Audit scope and evidence limitation

This is an evidence-backed deployment, API, source-observable frontend, automated-test, and Lighthouse audit. The supported interactive browser could not start because the Codex desktop Windows sandbox repeatedly failed during browser initialization. Therefore clicks, keyboard-only traversal, browser Back/Forward, exact viewport screenshots, password-manager behavior, email inbox delivery, cross-browser behavior, multi-tab behavior, and DevTools throttling were **not tested**. They are never marked as passing below.

Evidence used:

- Live HTTP checks against `https://frontend-kappa-fawn-15.vercel.app` on 2026-07-18.
- Inspection of the deployed HTML and 1,101,308-byte production JavaScript bundle.
- Safe direct API tests against `https://nexora-ai-backend-1yvz.onrender.com/api` with one fake student account.
- Existing Lighthouse 13.4.0 artifact captured 2026-07-18 at 09:02:54 UTC with Headless Chrome 150 and Moto G Power mobile emulation.
- Local frontend production build, frontend tests, backend tests, and source-observable behavior.

No purchase, sensitive information, destructive security testing, or access to another user's private data was attempted.

## 1. Executive summary

| Area | Score |
| --- | ---: |
| Overall | 2.8/10 |
| User experience | 4.0/10 |
| Visual design | 6.5/10 |
| Functionality | 1.5/10 |
| Mobile responsiveness | 3.0/10 |
| Accessibility | 4.5/10 |
| Performance | 7.0/10 |
| Developer quality | 4.0/10 |
| Production readiness | 1.5/10 |

**Classification: Prototype only / not ready.** The registration page renders, the backend can register and authenticate a fake student when called directly, and the frontend builds. However, the deployed frontend contains a malformed API base URL (`VITE_API_URL=https://.../api` as the literal value), so the core browser journey cannot reach the backend. Registration, login, dashboard data, AI features, uploads, tutoring, groups, games, notifications, and logout cannot be accepted as working end-to-end.

The strongest positives are a coherent visual direction, visible labels, HTTPS, backend CORS support for the Vercel origin, correct direct-backend registration/login behavior, and good Lighthouse lab scores. The largest risks are the production API configuration, absent password recovery and email verification, non-revoked JWTs after logout, client-readable token storage, exposed production demo/admin credentials, and accessibility controls whose labels promise behavior that the application lifecycle does not apply.

## 2. Test environment

| Item | Value |
| --- | --- |
| Date/time | 2026-07-18, approximately 15:20 IST |
| OS | Windows 10/11 host reported by Chrome user agent |
| Browser | Headless Chrome 150 for existing Lighthouse artifact; interactive browser unavailable |
| Browser version | Chrome 150.0.0.0 in Lighthouse artifact |
| Screen sizes tested | Moto G Power mobile emulation only in Lighthouse; requested exact widths not interactively tested |
| Roles tested | Student role through direct backend API; educator/tutor and admin UI not tested |
| Network conditions | Lighthouse mobile throttling profile in existing artifact; live HTTP on normal connection; Slow/Fast 3G not independently run |
| Account data | Fake name and unique `@example.com` email; no real personal data |

## 3. Features tested

| Feature | Test performed | Result | Notes |
| --- | --- | --- | --- |
| Registration page load | Direct GET and refresh-equivalent request | Pass | HTTP 200, SPA shell, title `Nexora AI` |
| Registration UI fields | Deployed bundle/source inspection | Partial | Name, email, password, learning track, accessibility type, communication style present |
| Empty/invalid/short registration | Direct backend API | Pass at backend | HTTP 400; frontend end-to-end blocked |
| Valid registration | Direct backend API with fake data | Pass at backend only | HTTP 201; role `student`; dyslexia defaults saved |
| Duplicate registration | Direct backend API | Pass at backend | HTTP 400; browser flow blocked |
| Valid login | Direct backend API | Pass at backend only | HTTP 200 |
| Wrong password | Direct backend API | Pass at backend | HTTP 401 with generic `Invalid credentials` in implementation |
| Protected API | `/auth/me` with and without bearer | Partial | Valid token works; unauthenticated access rejected by backend implementation/tests |
| Logout | Direct backend logout then token reuse | Fail | HTTP 200 logout, but same bearer token still returned HTTP 200 from `/auth/me` |
| Email verification | Route/UI/API inventory | Fail | Not implemented |
| Password recovery | Login UI and route/API inventory | Fail | Visible button has no action; no reset route |
| Student dashboard/core features | Route and source inventory | Blocked | Frontend API configuration prevents end-to-end use |
| Educator/tutor flow | Route and source inventory | Not tested | No educator role at registration; “Become a Tutor” exists after login |
| File uploads | UI/backend configuration inspection | Not tested end-to-end | PDF UI inputs; backend limit 10 MB; no cancel/delete UI |
| Accessibility controls | Lifecycle/store/source comparison | Fail/partial | Several controls persist state but are not applied to the UI |
| Route refresh | Live GET for all routes | Pass at server shell level | All return HTTP 200 SPA shell |
| Invalid route | Live GET plus router inspection | Fail | HTTP 200 shell and client redirects; no 404 experience |
| Frontend build | `npm run build` | Pass with warning | 1.10 MB JS chunk, 324.73 KB gzip |
| Frontend tests | Vitest | Pass but inadequate | 2/2 shallow tests passed |
| Backend tests | Jest | Fail | 15 passed, 2 privacy tests failed on setup timeout/teardown |
| Lighthouse | Existing artifact | Partial | Performance 94, Accessibility 96, Best Practices 96, SEO 82 |

## 4. Issues found

| ID | Page | Issue | Steps to reproduce | Expected | Actual | Severity | Suggested fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NXR-001 | All data-backed pages | Production API base URL is malformed and blocks the core browser journey | Open deployed bundle; search `/auth/register`; submit registration/login when browser is available | Requests target `https://nexora-ai-backend-1yvz.onrender.com/api/...` | Bundle sets base URL to literal `VITE_API_URL=https://nexora-ai-backend-1yvz.onrender.com/api` | Critical | Set Vercel variable value to URL only, rebuild, then regression-test every API flow |
| NXR-002 | Login | “Forgot password?” is a dead button and recovery is absent | Open login and activate control | Recovery form and email flow open | Button has no handler/link; backend has no reset routes | High | Implement request-reset and reset-password flows with single-use expiring tokens |
| NXR-003 | Register/Auth | Email verification is absent | Register directly through backend and inspect returned state/routes | Verification instructions and restricted unverified account | Account is immediately authenticated; no verification state/routes | High | Add verified flag, email delivery, resend, expiry, and enforcement |
| NXR-004 | Logout | Logout does not revoke bearer session | Register directly, call logout, reuse same bearer on `/auth/me` | Token rejected after logout | Same token returned HTTP 200 after logout | High | Use revocable sessions/token versioning or short-lived access tokens plus revoked refresh tokens |
| NXR-005 | Auth | JWT is returned to JavaScript and stored in `localStorage` despite an HttpOnly cookie | Login/register and inspect response/storage | Session secret inaccessible to page scripts | API returns token and frontend writes it to `localStorage` | High | Use cookie-only auth with CSRF protection; do not return/store bearer in JS |
| NXR-006 | Login | Production page exposes demo and admin credentials | Open login page | Production auth page contains no privileged shared credentials | Admin and student passwords are rendered as quick-demo controls | High | Remove from production; isolate demo tenant with non-privileged disposable accounts |
| NXR-007 | Register/Login/Mobile | Auth content can become inaccessible at short heights, 200% zoom, or narrow screens | Use 320 px width or 200% zoom when browser is available | Page scrolls to all fields/actions | Global `html, body` use `overflow-hidden`; auth pages have no internal scroll container | High | Allow document scrolling on auth routes and test 320 px/200% zoom with keyboard |
| NXR-008 | Register | No confirm-password field | Complete step 1 | User confirms password and mismatch is blocked | Only one password field exists | Medium | Add confirm password with inline mismatch validation |
| NXR-009 | Register | Enforced password policy contradicts strength guidance | Enter six lowercase characters | Weak password rejected or policy accurately explained | Frontend/backend accept any six characters while UI recommends uppercase/numbers/symbols | Medium | Adopt one policy and enforce it client/server; support password managers/paste |
| NXR-010 | Register/Roles | No student/educator role selection or educator onboarding | Complete registration | Supported roles are clear and saved with role-specific onboarding | All registrations become `student`; tutor signup is a later separate feature | Medium | Define role model and onboarding; protect role-specific capabilities server-side |
| NXR-011 | Post-registration | No onboarding flow | Register directly | Clear, resumable onboarding before dashboard | Registration immediately authenticates and navigates to dashboard | Medium | Add minimal optional onboarding with progress persistence and skip/back controls |
| NXR-012 | Register | Missing Terms, Privacy, consent, help, and verification explanation | Inspect footer/form | Working legal/support links and consent language | Only sign-in link is present | Medium | Add linked policies, consent wording, support, and verification expectation |
| NXR-013 | Register | Fields omit `name`, `required`, and autocomplete tokens | Inspect inputs | Autofill-compatible semantic fields | Inputs have IDs/types but no names, required attributes, or autocomplete | Medium | Add `name`, `required`, `autocomplete="name email new-password"` |
| NXR-014 | Register | Inline errors are not associated or announced | Submit invalid step 1 using keyboard/screen reader | `aria-invalid`, `aria-describedby`, and live announcement | Plain paragraphs are visually shown without programmatic association | Medium | Connect errors to fields and use an appropriate live region/focus strategy |
| NXR-015 | Register | Email is not trimmed and has no practical length limit | Enter leading/trailing spaces or very long email | Normalize whitespace and reject overlong input clearly | Regex rejects spaces; no trim/max length is applied | Medium | Trim/lowercase before validation; enforce standards-compatible max length |
| NXR-016 | Landing/Register | Accessible-track CTA query is ignored | Open `/register?track=neurodivergent` | Accessible track preselected | Registration state always starts as `normal` | Medium | Parse the query parameter and set initial track safely |
| NXR-017 | Register | Accessible track can be submitted with no accessibility type | Choose Accessible without ADHD/Autism/Dyslexia and submit | Clear optional choice such as “No preset / configure later” | Hidden default remains `none`, making intent ambiguous | Medium | Add explicit “No preset / configure later” option and explain optionality |
| NXR-018 | Register | “I identify as” frames support as diagnosis disclosure | Choose Accessible | Preference-led, respectful wording | User is asked to identify as ADHD/autism/dyslexia | Medium | Ask which support preset they want; state no diagnosis is required |
| NXR-019 | Invalid URLs | No 404 page/status experience | GET `/does-not-exist` | Branded 404 with recovery navigation | HTTP 200 SPA shell; router redirects authenticated users to dashboard or guests to login | Medium | Add explicit catch-all 404 route and platform handling where feasible |
| NXR-020 | All routes | Every route uses the same document title | GET/open each route | Context-specific titles | All server shells use `Nexora AI` | Medium | Set route-level titles and descriptions |
| NXR-021 | All routes | Favicon request fails | Load `/register` | Favicon loads | Lighthouse console: `Failed to load resource...404` for `/favicon.ico` | Medium | Link `/favicon.svg` explicitly and/or provide `/favicon.ico` |
| NXR-022 | Public pages | SEO metadata and crawler files are incomplete | Run Lighthouse | Valid description and crawler files | No meta description; invalid robots.txt; SEO 82 | Medium | Add metadata and valid `robots.txt`; validate deployment output |
| NXR-023 | Register/Login | Global skip link has no valid target on auth routes | Focus skip link on auth page | Link moves focus to main content | Auth pages do not render `#main-content`; Lighthouse reports no main landmark and non-focusable skip link | Medium | Render semantic `<main id="main-content">` on every page |
| NXR-024 | All pages | Global `select-none` prevents normal text selection/copy | Try selecting instructional/error text | Text can be selected unless interaction specifically requires otherwise | Body disables selection globally | Medium | Remove global `select-none`; apply only to controls that need it |
| NXR-025 | Accessibility | Animations toggle is not applied by lifecycle | Turn Animations off | Motion stops immediately and persists | Lifecycle never maps `animations: false` to a no-motion class | Medium | Apply setting globally and test against `prefers-reduced-motion` |
| NXR-026 | Accessibility | Reading Mode is stored but not applied | Enable Reading Mode | Reading content narrows consistently | Lifecycle does not apply `readingMode` class | Medium | Apply reading class to appropriate content container and verify |
| NXR-027 | Accessibility | Reduced Distractions is stored but not applied | Enable option | Non-essential UI reduces predictably | No lifecycle/UI mapping is present | Medium | Define non-essential regions and an reversible reduced-distraction state |
| NXR-028 | Accessibility | Predictable Navigation claims behavior without implementation | Enable option | Navigation position/state becomes stable | Setting is persisted but no behavior changes | Medium | Implement exact behavior or remove/rename control |
| NXR-029 | Accessibility | Arial, Verdana, and Vazirmatn choices are ignored | Choose each font | Selected font applies globally | Lifecycle only handles OpenDyslexic and default | Medium | Map every offered font; package fonts locally where possible |
| NXR-030 | Accessibility | Wide and Wider line-spacing choices are ignored globally | Choose Wide/Wider | Chosen spacing applies | Lifecycle only maps `extra` | Medium | Map all values consistently and avoid forcing spacing on controls/icons |
| NXR-031 | Uploads | No upload cancellation, true progress, or deletion workflow | Start career/game upload | Progress, cancel, retry, preview, and delete controls | Career shows timed status text; no cancel/delete; backend routes expose no file deletion | Medium | Use upload progress/cancellation and implement lifecycle/privacy controls |
| NXR-032 | Performance | Main JS chunk is oversized and mostly eager-loaded | Run production build/Lighthouse | Route-level code splitting and limited unused JS | 1.10 MB minified/324.73 KB gzip; Lighthouse estimates 219 KiB unused JS | Medium | Lazy-load routes/features and split vendor/chart/game code |
| NXR-033 | Accessibility | Line-spacing option order/labels are confusing | Open settings | Options increase monotonically | `Wider (2.3x)` precedes `Extra Wide (1.95x)` | Low | Rename/reorder values and use accurate ratios |
| NXR-034 | Navigation | Labels are inconsistent across desktop/mobile | Compare sidebar and mobile drawer | Stable terminology | `Spaced Review`/`Review`, `Peer Tutors`/`Tutors`, `Accessibility`/`Access.` | Low | Create one shared navigation model and consistent labels |
| NXR-035 | Register | Communication options imply unsupported voice/video call functionality | Choose Voice Calls or Video Calls | Capability and limitations are clear | Preference is saved, but no verified in-app calling flow was found | Low | Rename as preference or implement/integrate calling with consent/privacy details |
| NXR-036 | Register | Password visibility accessible name is too vague | Focus eye button with screen reader | “Show password”/“Hide password” | Register uses only `Show`/`Hide` | Low | Match the clearer login-page labels |
| NXR-037 | QA | Automated frontend coverage is far below core risk | Run frontend tests | Auth, routing, forms, accessibility, and API integration covered | Only two shallow unit tests pass; existing E2E file has five basic navigation assertions | Low | Add deployment smoke, auth, role, upload, keyboard, and regression suites |

All issues above were consistent in the inspected deployment/source or direct API tests. Browser-interaction-dependent reproduction still requires retesting after the browser environment is available.

## 5. Console and network errors

| Console message / symptom | Page/action | Related request | Status | Likely cause |
| --- | --- | --- | ---: | --- |
| `Failed to load resource: the server responded with a status of 404 ()` | Registration page load | `https://frontend-kappa-fawn-15.vercel.app/favicon.ico` | 404 | HTML does not link the available SVG favicon and no ICO exists |
| Production bundle base URL is `VITE_API_URL=https://nexora-ai-backend-1yvz.onrender.com/api` | Any API action | Auth/core endpoints | Browser request not captured | Vercel environment variable value includes the variable name/prefix |
| Same-origin diagnostic `/api/auth/*` calls | Direct diagnostic only | Vercel `/api/auth/*` | 404 | Vercel hosts only the SPA; actual backend is Render |
| Backend privacy Jest suite | Automated tests | MongoMemoryServer setup | Test timeout | 5-second hook timeout and teardown assumes setup succeeded |

No React warning, CORS error, hydration error, or unhandled promise rejection is marked absent because an interactive DevTools session was unavailable. The backend CORS preflight from the Vercel origin returned HTTP 204 with the correct allow-origin and credentials headers.

## 6. Registration and authentication report

- **Registration:** Backend passes direct valid registration (HTTP 201), but deployed frontend registration is blocked by NXR-001.
- **Validation:** Name, email shape, and six-character minimum exist client/server. Confirm password, trimming, length limits, strong-policy enforcement, consent, and screen-reader announcement are missing.
- **Email verification:** Not implemented.
- **Login:** Backend passes direct valid login (HTTP 200) and returns generic invalid-credential behavior; browser login is blocked by NXR-001.
- **Logout:** Frontend removes local token, but backend does not revoke it; direct reuse succeeded.
- **Session persistence:** Designed for seven days and localStorage persistence; not browser-tested. This design increases token theft exposure.
- **Password recovery:** Missing; visible control is dead.
- **Protected routes:** Client routes redirect based on store state; backend endpoints use authentication middleware. Direct unauthenticated UI behavior was not interactively tested.
- **Role protection:** `/admin` is client-gated and admin APIs are server-gated. Student direct backend registration produced `student`. Full cross-role UI testing was blocked.

## 7. User-flow report

`Registration -> Verification -> Login -> Onboarding -> Dashboard -> Core feature -> Logout`

The intended flow currently breaks at registration because the browser cannot address the backend. Even after configuration is corrected, Verification and Onboarding do not exist. The backend immediately authenticates a new user and the UI navigates directly to Dashboard. Core features depend on the same API client and therefore require full regression after NXR-001. Logout appears successful to the user but does not invalidate the bearer token, reducing trust in session security.

First-time-user confusion points include diagnostic-style wording, no explicit “configure later” accessibility choice, no legal/verification explanation, a weak-password meter that is advisory rather than enforced, and communication options that imply voice/video capabilities not established by the tested flow.

## 8. Navigation and route report

| Route | Page | Auth required by client | Live shell loads | Refresh shell | Problems |
| --- | --- | --- | --- | --- | --- |
| `/` | Landing | No | Yes | Yes | Same generic title |
| `/register` | Register | No | Yes | Yes | API blocked; legal/auth/a11y issues |
| `/login` | Login | No | Yes | Yes | API blocked; dead recovery; demo credentials |
| `/dashboard` | Dashboard | Yes | Yes | Yes | Data flow blocked |
| `/review` | Spaced Review | Yes | Yes | Yes | Data flow blocked |
| `/career` | Career Path | Yes | Yes | Yes | Data/upload flow blocked |
| `/tutors` | Peer Tutors | Yes | Yes | Yes | Data flow blocked; educator role unclear |
| `/groups` | Study Groups | Yes | Yes | Yes | Data flow blocked |
| `/games` | Learn & Play | Yes | Yes | Yes | Data/AI/upload flow blocked |
| `/accessibility` | Accessibility | Yes | Yes | Yes | Several controls ineffective |
| `/admin` | Admin | Admin | Yes | Yes | Public demo admin credentials; UI not tested |
| `/does-not-exist` | Invalid | Router-dependent | Yes (HTTP 200) | Yes | No 404 page |

Back/Forward, active-state accuracy, opening in new tabs, and post-logout history behavior remain untested.

## 9. Responsive report

| Screen width | Result | Main issues |
| ---: | --- | --- |
| 320 | Not interactively tested | High risk of inaccessible auth content because document scrolling is disabled |
| 375 | Not interactively tested | Same risk; mobile drawer requires keyboard/focus retest |
| 390 | Not interactively tested | Same risk |
| 425 | Partial automated emulation only | Lighthouse lab rendering completed; interaction not tested |
| 768 | Not interactively tested | Tablet navigation/modal behavior unknown |
| 1024 | Not interactively tested | Desktop auth split layout begins at `lg`; verify zoom behavior |
| 1366 | Not interactively tested | No evidence of overlap; interaction unknown |
| 1440 | Not interactively tested | No evidence of overlap; interaction unknown |
| 1920 | Not interactively tested | Check excessive whitespace and card widths |
| 80% zoom | Not tested | Requires browser retest |
| 125% zoom | Not tested | Requires browser retest |
| 200% zoom | Fail risk from code | Global overflow lock can prevent reaching content |

## 10. Accessibility report

- **Keyboard usability:** Not tested. Native buttons/links are used in many places, but focus order, Escape behavior, focus trapping/return, and keyboard traps require live retest.
- **Screen-reader concerns:** Registration errors lack field associations/live announcement. Register eye control is vaguely named. Several icon-only or emoji-heavy controls require name verification.
- **Colour contrast:** Lighthouse did not flag a contrast failure in the artifact; all states/themes still require manual contrast checks.
- **Form labels:** Visible labels exist for primary auth fields. Registration lacks required semantics, autocomplete, and error associations.
- **Focus states:** A global `:focus-visible` rule exists. Visual confirmation was unavailable.
- **Landmarks/skip link:** Lighthouse reports no main landmark and a non-focusable skip link on registration. The skip target exists only inside protected layout.
- **Cognitive accessibility:** Good intentions include presets, progress indication, reduced-motion media query, clear grouping, and TTS options. Trust is reduced because multiple settings do not produce their claimed effects.
- **Neurodivergent-friendly design:** Presets are useful in concept, but identity wording is unnecessarily diagnostic and several promised modes are incomplete.
- **Lighthouse accessibility:** **96/100** on the registration artifact. This score does not override the functional issues above.

## 11. Performance report

| Metric | Result |
| --- | ---: |
| Lighthouse Performance | 94/100 |
| First Contentful Paint | 2.5 s |
| Largest Contentful Paint | 2.5 s |
| Cumulative Layout Shift | 0 |
| Total Blocking Time | 10-14 ms |
| Speed Index | 2.5 s |
| Time to Interactive | 2.5 s |
| Transfer size (Lighthouse) | 332 KiB |
| Requests (registration artifact) | 4 |
| Local production JS | 1,101.96 KiB minified / 324.73 KiB gzip |
| Local production CSS | 67.86 KiB / 11.71 KiB gzip |
| Estimated unused JS | 219 KiB |

Main causes: all routes/features are eagerly bundled, the API module's attempted dynamic import cannot create a separate chunk because it is also statically imported, and large chart/game/admin feature code is delivered on registration. Missing valid source maps were flagged by Lighthouse; source-map exposure itself was not found.

Slow 3G, Fast 3G, low-end CPU, and separate desktop Lighthouse runs remain required.

## 12. Visual and UX feedback

### What is already good

- Coherent teal/emerald brand palette and consistent rounded-card language.
- Clear two-step registration structure with a visible progress indicator.
- Visible labels and a password-strength visualization.
- Thoughtful empty-state text is present in several feature pages.
- Accessibility presets, TTS, focus tools, and Pomodoro are prominent rather than hidden.

### What feels unfinished

- Authentication is disconnected in production.
- Recovery, verification, onboarding, 404, and legal flows are absent.
- Several accessibility settings are controls without functioning outcomes.
- Upload lifecycle stops at selection/submission; cancel, delete, retry, privacy, and preview are incomplete.

### What is confusing

- “Strong” password guidance is not the actual password requirement.
- “Accessible” then “I identify as” conflates support preferences and diagnosis.
- Voice/video communication choices are offered without a demonstrated calling workflow.
- Different navigation surfaces use different names for the same destinations.

### What reduces trust

- Visible shared admin password on a production URL.
- Dead “Forgot password?” button.
- No legal/privacy or verification explanation at registration.
- Logout that leaves the bearer token valid.
- Favicon 404 and generic titles on every route.

### What should be redesigned

- Make registration preference-led: “Choose support settings now” with “Configure later.”
- Give auth pages a scroll-safe semantic layout at 320 px and 200% zoom.
- Consolidate navigation labels into a single source.
- Replace nonfunctional settings with verified controls and a preview that demonstrates each change.

## 13. Developer feedback

- **Frontend architecture:** React/Zustand/TanStack Query structure is understandable, but all routes are eagerly imported and produce a 1.10 MB main chunk.
- **Error handling:** API fallbacks exist, but the network message references local port 5000 in production. Server failures are mostly toasts and are not tied to fields/live regions.
- **State management:** Authentication persists a bearer token in localStorage. Accessibility state persists locally and then attempts DB synchronization, but lifecycle mappings are incomplete.
- **API interaction:** CORS and direct backend auth work. The deployed environment value is malformed and blocks all browser integration.
- **Route protection:** Client protection is present; admin APIs also use server authorization. Full role matrix retest is required.
- **Storage/authentication:** Cookie and bearer mechanisms are duplicated. Logout clears client state but does not revoke bearer credentials.
- **Maintainability:** Registration/login duplicate substantial auth layout. Navigation labels are duplicated. Only two frontend unit tests cover the application.
- **Automated health:** Frontend build/tests pass with chunk warning. Backend has 15 passing tests and 2 failing privacy tests due to MongoMemoryServer setup timeout and unsafe teardown.

## 14. Recommended fixes by priority

### Fix immediately

1. Correct the production API environment value and redeploy.
2. Remove production demo/admin credentials.
3. Implement real password recovery and email verification.
4. Move to cookie-only/revocable sessions and ensure logout invalidates active credentials.
5. Make auth pages scroll-safe at narrow widths and 200% zoom.

### Fix before beta release

Complete NXR-008 through NXR-032, then perform a real browser regression across auth, role permissions, data persistence, all feature APIs, uploads, accessibility controls, keyboard use, responsive widths, and network failure states.

### Polish before production

Complete NXR-033 through NXR-037, add route-specific metadata, and standardize wording/navigation.

## 15. Final verdict

1. **Can a new user successfully register?** No through the deployed frontend; yes only by calling the backend directly.
2. **Can a returning user successfully log in?** No through the deployed frontend; yes only by calling the backend directly.
3. **Do the core features actually work?** Not established; they are blocked by the shared API configuration.
4. **Is the website usable on mobile?** Not proven; auth scrolling has a high-risk defect.
5. **Is it accessible enough for its target users?** No. Lighthouse is strong, but broken landmarks and nonfunctional accessibility preferences are material.
6. **Does it feel trustworthy?** Not yet, due to dead recovery, demo admin credentials, missing legal/verification, and session handling.
7. **Ready to show judges/clients/educators/investors?** Only as a clearly labelled prototype after fixing NXR-001 and removing credentials.
8. **Ready for real users?** No.
9. **Five most important changes:** API configuration; secure revocable auth; recovery/verification; functional accessibility settings; complete responsive/end-to-end regression.

## Full fix checklist

| Fix ID | Issue ID | Required fix | Priority | Files/components likely involved | Verification steps | Status |
| --- | --- | --- | --- | --- | --- | --- |
| FX-001 | NXR-001 | Correct Vercel API URL value and redeploy | Critical | Vercel config, `frontend/src/services/api.ts`, socket config | Register/login, inspect exact requests, run every data route | Blocked by configuration |
| FX-002 | NXR-002 | Implement reset request/completion | High | Login page, auth routes/controller/model, email provider | Empty/invalid/unregistered/registered, expiry, reuse, old/new password | Not started |
| FX-003 | NXR-003 | Implement email verification and enforcement | High | Auth controller/model/routes, email templates, protected middleware | Delivery, resend, duplicate/expired link, restricted access | Not started |
| FX-004 | NXR-004 | Revoke sessions on logout | High | Auth/session model and middleware | Logout then reuse token in same/other tab and Back/refresh | Needs investigation |
| FX-005 | NXR-005 | Remove JS-readable bearer storage | High | Auth controller, API client, auth store, CSRF middleware | Confirm no token in response/localStorage; cookie flow works | Requires design decision |
| FX-006 | NXR-006 | Remove production demo credentials | High | Login page, seed/deployment strategy | Inspect production bundle/UI; admin login unavailable publicly | Not started |
| FX-007 | NXR-007 | Restore auth-page scrolling | High | `frontend/src/index.css`, auth layouts | 320-1920 px, landscape, 125/200% zoom, virtual keyboard | Not started |
| FX-008 | NXR-008 | Add confirm password | Medium | Register page, shared validation schema | Match/mismatch, paste, password manager, preserved fields | Not started |
| FX-009 | NXR-009 | Align and enforce password policy | Medium | Register page, backend validation/model | Each stated rule boundary and long password | Requires design decision |
| FX-010 | NXR-010 | Define educator role/onboarding | Medium | Register, user model, auth/tutor/admin routes | Student/tutor/admin matrix and direct URL access | Requires design decision |
| FX-011 | NXR-011 | Build resumable onboarding | Medium | New onboarding routes/store/API | Back/skip/refresh/completion/data minimization | Requires design decision |
| FX-012 | NXR-012 | Add legal/support/consent links | Medium | Register/footer/legal routes | Open every link, keyboard, new-tab behavior | Requires design decision |
| FX-013 | NXR-013 | Add form semantics/autocomplete | Medium | Register inputs | Browser autofill and accessibility tree | Not started |
| FX-014 | NXR-014 | Associate and announce errors | Medium | Register validation/error components | Keyboard/screen reader invalid submissions | Not started |
| FX-015 | NXR-015 | Normalize and bound email input | Medium | Register, backend schema/model | Whitespace, long email, case, Unicode policy | Not started |
| FX-016 | NXR-016 | Honor track query parameter | Medium | Landing/Register | Open CTA URL directly and refresh | Not started |
| FX-017 | NXR-017 | Add explicit no-preset choice | Medium | Register step 2 | Select each state and verify saved profile | Requires design decision |
| FX-018 | NXR-018 | Rewrite diagnosis-led wording | Medium | Register/accessibility copy | First-time-user comprehension review | Requires design decision |
| FX-019 | NXR-019 | Add 404 experience | Medium | App router, Vercel routing | Invalid guest/auth URLs and refresh | Not started |
| FX-020 | NXR-020 | Add per-route titles | Medium | Route metadata helper/pages | Inspect title on every route/Back/Forward | Not started |
| FX-021 | NXR-021 | Fix favicon | Medium | `frontend/index.html`, public assets | Network 200, browser tab icon | Not started |
| FX-022 | NXR-022 | Add metadata/valid crawler files | Medium | HTML/public assets | Lighthouse SEO and direct file checks | Not started |
| FX-023 | NXR-023 | Add main landmarks/valid skip target | Medium | App/auth/landing layouts | Keyboard focus skip on every route | Not started |
| FX-024 | NXR-024 | Remove global text-selection lock | Medium | Global CSS | Select/copy text while controls remain usable | Not started |
| FX-025 | NXR-025 | Implement animations setting | Medium | App accessibility lifecycle/CSS | Toggle, refresh/login, OS reduced motion | Not started |
| FX-026 | NXR-026 | Implement reading mode | Medium | Lifecycle/content layout | Toggle across reading/game/content pages | Not started |
| FX-027 | NXR-027 | Implement reduced distractions | Medium | Lifecycle/layout/component classes | Toggle and verify only nonessential regions change | Requires design decision |
| FX-028 | NXR-028 | Implement predictable navigation | Medium | Layout/navigation/store | Toggle across routes/viewports/refresh | Requires design decision |
| FX-029 | NXR-029 | Apply all offered fonts | Medium | Lifecycle/CSS/font assets | Visual/computed-font check for each option | Not started |
| FX-030 | NXR-030 | Apply all spacing options | Medium | Lifecycle/CSS | Computed styles and layout regression | Not started |
| FX-031 | NXR-031 | Complete upload lifecycle | Medium | Career/Game pages, API, backend storage routes | Valid/invalid/large/duplicate/cancel/delete/privacy/network loss | Blocked by backend |
| FX-032 | NXR-032 | Split bundle by route/feature | Medium | App imports/Vite build | Build chunks, Lighthouse, no regressions | Not started |
| FX-033 | NXR-033 | Correct spacing labels/order | Low | Accessibility page/types | Visual review and value verification | Not started |
| FX-034 | NXR-034 | Centralize navigation labels | Low | Sidebar/Header/MobileBottomNav | Compare every nav surface and active state | Not started |
| FX-035 | NXR-035 | Clarify/implement communication options | Low | Register/profile/tutor flows | Verify each saved choice has a real effect | Requires design decision |
| FX-036 | NXR-036 | Improve eye-button name | Low | Register page | Screen-reader accessible-name check | Not started |
| FX-037 | NXR-037 | Expand automated coverage | Low | Frontend tests/E2E/CI | Run unit, integration, deployment smoke, a11y suites | Not started |

## Prioritised summary

### Immediate release blockers

- NXR-001 through NXR-007.
- Registration/login/core browser flows must pass after the API fix; a configuration correction alone is not sufficient evidence.

### Required before production

- NXR-008 through NXR-032.
- Complete real-browser registration, verification, login, recovery, onboarding, student, tutor, admin, AI, upload, role, persistence, logout, responsive, keyboard, accessibility, console, network, and performance regression.
- Resolve the two failing backend privacy tests and verify account export/deletion through an exposed, understandable user flow.

### Recommended polish

- NXR-033 through NXR-037.

## Retesting requirements

For each issue, record the original ID, commit/fix, repeated steps, expected/actual result, pass/fail, screenshot, console status, network status, and regressions. Then run the complete regression matrix requested in the brief. None of the browser-only checks may be inferred from code or Lighthouse alone.

## Final required output

| Measure | Result |
| --- | ---: |
| Total issues found | 37 |
| Critical | 1 |
| High | 6 |
| Medium | 25 |
| Low | 5 |
| Issues fixed | 0 |
| Issues remaining | 37 |
| Remaining release blockers | 7 (1 Critical, 6 High) |
| Regression-test result | **Fail / incomplete** |
| Final production-readiness score | **1.5/10** |
| Verdict | **Not ready — Prototype only** |

Complete remaining issue list: **NXR-001 through NXR-037**. No issue is marked fixed because no remediation was requested or implemented, and interactive retesting was unavailable.
