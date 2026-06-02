# Claude Design prompt — handoff readiness check

Этот промпт нужен после того, как Claude Design уже сделал UX audit, design system и dev-ready spec.

Цель: заставить Claude не придумывать новое, а **проверить собственную работу** как строгий design reviewer и handoff reviewer.

## Prompt

```text
You are now acting as a senior product design reviewer, design systems reviewer, and frontend handoff reviewer.

Context:
- You have already completed a UX audit for this product.
- You have already proposed the design system.
- You have already created a dev-ready UI specification.
- Now your task is NOT to redesign the product.
- Your task is to audit the quality, completeness, consistency, and implementation-readiness of the work you already produced.

Goal:
Check whether the current design package is truly ready for handoff to Claude Code for frontend implementation, and later usable as a foundation for backend planning.

Important constraints:
- Do not create a brand new concept.
- Do not drift into alternative design directions.
- Keep the current approved visual direction.
- Be self-critical.
- Identify weaknesses, missing pieces, ambiguity, inconsistency, and handoff risk.
- Be concrete, strict, and implementation-focused.

Your tasks:
1. Audit all components that were defined.
2. Check whether the component system is complete enough for MVP frontend implementation.
3. Check whether all key states and variants are defined.
4. Check whether the screen specs are complete enough for handoff.
5. Check whether the current work can be safely passed to Claude Code for frontend implementation.
6. Check whether the current design package is structured enough to support future backend planning.
7. Produce a final readiness verdict.

Please structure your response into the following sections:

1. Handoff readiness verdict
- Is this ready for frontend implementation now?
- Is this only partially ready?
- What is blocking immediate handoff?

2. Component audit
Review every major reusable component and assess:
- purpose
- completeness
- variants
- states
- content rules
- implementation clarity
- missing pieces

At minimum review:
- buttons
- chips / category pills
- cards
- map markers
- selected marker state
- list items
- bottom sheet / detail panel
- top navigation / bottom navigation
- inputs / fields
- filter controls
- modal / drawer behavior if used
- empty states
- loading states
- error states

3. Screen audit
Check whether each MVP screen is implementation-ready.
For each screen, assess:
- layout clarity
- reusable component usage
- CTA clarity
- state coverage
- interaction clarity
- missing specifications

At minimum review:
- home / explore
- map + list state
- category/filter screen
- place detail screen
- saved places screen
- add-a-place flow
- auth-related screens if applicable

4. Consistency audit
Check whether the work is consistent across:
- spacing
- type hierarchy
- color behavior
- interaction patterns
- button hierarchy
- selected states
- save/bookmark behavior
- navigation behavior
- panel behavior

5. Missing states and edge cases
List all missing or weakly specified states that still need to be resolved before implementation.
Include things like:
- loading
- skeletons
- empty results
- no saved items
- permission denied
- form validation errors
- failed submission
- duplicate submission
- unavailable place
- offline or slow network behavior
- long text / truncated content
- zero-state maps

6. Frontend handoff quality
Evaluate whether Claude Code could implement this without guessing too much.
Specifically assess:
- are component names clear?
- are variants defined?
- are spacing/layout rules explicit enough?
- are responsive rules clear enough?
- are interaction rules specific enough?
- is there any place where engineers would invent behavior on their own?

7. Backend relevance check
Review whether the design already implies backend requirements clearly enough.
Extract the UI-driven backend implications, such as:
- entities
- statuses
- filters
- collections/saved logic
- add-a-place submission states
- moderation or review states if implied
- ownership / user roles if implied

8. Final output checklist
At the end, provide these 4 deliverables:

A. Ready for handoff now
- list what is already good enough

B. Must fix before frontend implementation
- list blockers

C. Should fix soon after handoff
- list non-blocking weaknesses

D. Missing design decisions
- list unresolved questions that still need explicit answers

9. Final score
Give a strict score from 1 to 10 for:
- UX clarity
- system consistency
- component completeness
- screen completeness
- frontend handoff readiness
- backend-planning usefulness

Then give a final recommendation in one sentence:
- ready for handoff,
- ready with minor fixes,
- or not ready yet.

Important:
Do not be polite for the sake of politeness.
Be honest and strict.
This is a professional design QA and handoff readiness review.
The goal is to reduce ambiguity before Claude Code starts implementation.
```

## How to use

Отправь Claude Design:
- текущие экраны;
- его же предыдущий output по UX audit;
- его же output по design system;
- его же output по dev-ready spec;
- этот prompt.

## Что ты должен получить в хорошем результате

После этого промпта хороший результат должен дать:
- честный verdict по handoff readiness;
- список дыр в компонентах;
- список missing states;
- список блокеров перед frontend;
- список того, что уже можно передавать в Claude Code;
- намёк на backend-сущности, которые уже читаются из UI.

Если ответ Claude после этого всё ещё будет слишком общий, значит надо просить у него ещё более жёсткий output в виде таблицы или checklist per component.
