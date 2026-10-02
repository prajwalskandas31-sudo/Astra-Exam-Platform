# Frontend & UI Engineering Skill

## Purpose

Build a production-grade, premium, highly responsive frontend for a modern Computer-Based Test (CBT) examination and practice platform.

The platform must be suitable for examinations such as:

- JEE
- NEET
- COMEDK
- GATE
- AFCAT
- SSC CGL
- Banking examinations
- UPSC-style objective tests
- Other MCQ-based competitive examinations

The frontend should feel like a serious examination product used by professional coaching institutes, universities, and large-scale test-preparation companies.

The UI must prioritize:

1. Exam usability
2. Speed
3. Clarity
4. Low cognitive load
5. Accessibility
6. Mobile responsiveness
7. Consistent design
8. Performance
9. Reusability
10. Professional visual quality

---

# 1. Core Design Philosophy

The product is NOT a generic SaaS dashboard.

It is an examination platform.

Every UI decision must therefore answer:

> "Will this make it easier, faster, and safer for a student to take an examination?"

Avoid decorative UI that interferes with examination flow.

Prefer:

- Clear hierarchy
- Large readable typography
- Strong visual states
- Consistent spacing
- Predictable navigation
- Minimal animation during exams
- Obvious actions
- Strong error prevention
- Keyboard accessibility
- High information density where appropriate

Do NOT create:

- Excessive gradients
- Excessive glassmorphism
- Giant hero sections inside the examination interface
- Unnecessary animations
- Tiny text
- Excessive rounded cards
- Visually noisy dashboards
- Confusing icon-only controls
- UI that resembles a crypto/trading application

---

# 2. Design System First

Before implementing pages, establish a reusable design system.

Create:

- Color tokens
- Typography tokens
- Spacing tokens
- Border-radius tokens
- Shadow tokens
- Component states
- Breakpoints
- Z-index hierarchy
- Motion tokens
- Form-control standards

Use CSS variables/design tokens rather than hardcoding values throughout components.

Example conceptual structure:

```text
/design-system
  colors
  typography
  spacing
  shadows
  radii
  breakpoints
  motion