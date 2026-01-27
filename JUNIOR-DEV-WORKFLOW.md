# Junior Developer Workflow Guide

This document outlines a structured workflow for developing new features, managing code changes, and collaborating effectively using Git and GitHub. This guide is specifically tailored to the POKE MNKY project and aims to foster a robust and predictable development process.

---

## 1. Understanding the Roadmap and Phases

The project follows a phased development roadmap. Each phase represents a significant set of features or enhancements.

- **Phase 1: Community OS MVP (Complete)**
- **Phase 2: Sherpa Hub System (Complete)**
- **Phase 3: Sherpa Enhancements (Next)**: This is our current focus. It involves enhancing the Sherpa Hub with features like an Admin Review Interface, Vote to Resign functionality, Oathbreaker Penalties, and improved Oathkeeper score displays.
- **Phase 4: Resources & Builds Module (Planned)**
- **Phase 5: Discord Bot Integration (Planned)**
- **Phase 6: Advanced Features (Planned)**

Each phase is broken down into smaller, manageable deliverables, each of which will be implemented in its own feature branch and merged via a Pull Request.

---

## 2. Structured Git Workflow

A structured Git workflow is crucial for maintaining a clean, stable codebase and facilitating collaboration.

### 2.1 Branching Strategy: Feature Branches

For each new feature or enhancement, you will create a dedicated feature branch.

- **Naming Convention**: `feat/<phase-number>-<feature-description-kebab-case>`
  - Example: `feat/phase-3-admin-review-interface`
- **Purpose**: To isolate changes related to a specific feature, preventing conflicts with other ongoing work and ensuring that the `master` branch (or `main`) remains stable.

#### Steps to Create a Feature Branch:

1.  **Ensure your `master` (or `main`) branch is up-to-date**:
    ```bash
    git checkout master
    git pull origin master
    ```
    (Or `main` if that's the primary branch)
2.  **Create your new feature branch**:
    ```bash
    git checkout -b feat/phase-3-admin-review-interface
    ```
    (Replace with the appropriate branch name for your current deliverable)

### 2.2 Making Small, Focused Commits

Within your feature branch, you should make frequent, small commits.

-   **Purpose**: Each commit should represent a single, logical change. This makes it easier to track progress, revert mistakes, and review changes.
-   **Commit Message Convention**: While not strictly enforced for every single commit, aim for clear, descriptive messages that explain *what* was changed and *why*.
    -   Example: `feat: add initial admin review table structure`
    -   Example: `fix: resolve key prop warning in DatabaseManager`

#### Steps to Commit Changes:

1.  **Stage your changes**:
    ```bash
    git add .
    ```
    (Or `git add <file-path>` for specific files)
2.  **Commit your changes with a descriptive message**:
    ```bash
    git commit -m "feat: add initial admin review interface"
    ```

### 2.3 Pushing Your Feature Branch to GitHub

Once you have made some commits on your feature branch, you will push it to GitHub.

-   **Purpose**: To share your work with collaborators, create backups, and enable the creation of Pull Requests.
-   **First Push**: The first time you push a new branch, you'll need to set the upstream.
    ```bash
    git push -u origin feat/phase-3-admin-review-interface
    ```
    (Future pushes on this branch will just be `git push`)

### 2.4 Understanding Pull Requests (PRs)

A Pull Request (PR) is a formal proposal to merge changes from one branch (your feature branch) into another (e.g., `master`/`main`). It's a critical part of collaborative development.

-   **Collaboration**: PRs allow other developers (or you, from a different perspective) to review your code, provide feedback, and suggest improvements *before* it's merged into the main codebase.
-   **Code Quality**: Reviews help catch bugs, ensure coding standards are met, and improve the overall quality and maintainability of the project.
-   **Discussion & Approval**: PRs serve as a platform for discussion about the changes. They often require approval from one or more reviewers before the merge can proceed.
-   **Automated Checks**: GitHub (or other platforms) can run automated checks (like linting, tests, build checks) on your PR to ensure your changes don't introduce regressions or break the build.

#### When to Create a Pull Request:

You should create a PR when you have completed a specific feature or deliverable (e.g., the Admin Review Interface) on your feature branch, and it's ready for review and potential merging into `master`/`main`.

#### Typical PR Workflow:

1.  **Develop Feature**: Work on your feature branch, making small, frequent commits.
2.  **Test Locally**: Thoroughly test your feature to ensure it works as expected and doesn't introduce new bugs.
3.  **Create PR**: Go to GitHub (or use your IDE's Git integration) and create a new Pull Request from your feature branch to the target branch (usually `master`/`main`).
4.  **Write PR Description**: Provide a clear, concise description of your changes, including:
    -   Summary of what the PR does.
    -   Why the changes were made (context, problem solved).
    -   How to test the changes.
    -   Any relevant screenshots or links.
5.  **Request Review**: Ask a collaborator to review your code.
6.  **Address Feedback**: Respond to comments, make necessary changes, and push new commits to your feature branch (these will automatically update the PR).
7.  **Merge**: Once approved and all checks pass, the PR can be merged.

---

## 3. Phase 3 Development Plan: Sherpa Enhancements

Here's a detailed plan for implementing Phase 3, broken down into individual deliverables, each with its own feature branch and PR.

### Deliverable 1: Admin Review Interface for Sherpa Applications

**Goal**: Implement a UI for administrators to review and manage Sherpa applications.

-   **Feature Branch**: `feat/phase-3-admin-review-interface`
-   **Key Tasks**:
    1.  **Database Migration (if needed)**: Ensure `sherpa_applications` table has necessary fields for admin review (e.g., `status`, `review_notes`).
    2.  **Server Actions**:
        -   `getSherpaApplicationsForAdmin()`: Fetch all applications with details.
        -   `updateSherpaApplicationStatus(applicationId, newStatus, reviewNotes)`: Allow admins to approve, reject, or mark as pending.
    3.  **UI Component (`components/sherpa/admin-review-applications.tsx`)**:
        -   Display a list/table of Sherpa applications.
        -   Include application details (user info, Discord ID, etc.).
        -   Add actions for status updates (Approve/Reject buttons, text area for notes).
    4.  **Integrate into Admin Panel (`app/protected/admin/page.tsx`)**:
        -   Add a new section or tab for "Sherpa Applications Review".
        -   Render the `AdminReviewApplications` component.
-   **Testing Plan**:
    -   Verify that applications are fetched and displayed correctly.
    -   Test approving and rejecting applications and confirm status updates in the database.
    -   Ensure appropriate error handling for invalid operations.
-   **PR Checklist**:
    -   Code is clean and well-commented.
    -   All new components are properly integrated and styled (using ShadCN/MagicUI).
    -   Server actions handle database operations securely.
    -   Comprehensive unit/integration tests for server actions (if applicable).
    -   UI is responsive and user-friendly.

### Deliverable 2: Vote to Resign Functionality

**Goal**: Allow Guardians to initiate a vote for a Sherpa's resignation and implement the logic for majority checks.

-   **Feature Branch**: `feat/phase-3-vote-to-resign`
-   **Key Tasks**:
    1.  **Database Migration (if needed)**: Create a `sherpa_resign_votes` table (or similar) to track votes.
    2.  **Server Actions**:
        -   `initiateResignationVote(sherpaId)`: Start a vote.
        -   `castResignationVote(voteId, voterId, vote)`: Record a Guardian's vote.
        -   `checkResignationMajority(voteId)`: Call the existing `check_resignation_majority` RPC to determine if the vote passes.
    3.  **Discord Bot Integration**:
        -   New slash command `/sherpa vote-resign <sherpa_name>` for Guardians to initiate and cast votes.
        -   Logic to handle vote interactions (buttons/modals).
    4.  **UI Component (optional, for transparency)**:
        -   A read-only view in the Sherpa Hub displaying active resignation votes and their current status.
-   **Testing Plan**:
    -   Verify a Guardian can initiate a vote.
    -   Test multiple Guardians casting votes and verify correct majority calculation.
    -   Confirm that the existing `check_resignation_majority` RPC is correctly invoked and its result processed.
-   **PR Checklist**:
    -   New database tables/columns are defined in a migration.
    -   Server actions are robust and secure.
    -   Discord bot commands are fully functional and user-friendly.
    -   Clear error messages for users.

### Deliverable 3: Oathbreaker Penalties Implementation

**Goal**: Define and apply penalties for Sherpas who violate the Guardian Oath.

-   **Feature Branch**: `feat/phase-3-oathbreaker-penalties`
-   **Key Tasks**:
    1.  **Database Migration**: Create `oathbreaker_penalties` table with penalty types, duration, reason, and `sherp-id`.
    2.  **Server Actions**:
        -   `applyOathbreakerPenalty(sherpaId, penaltyType, reason, duration)`: Admin function to apply penalties.
        -   `removeOathbreakerPenalty(penaltyId)`: Admin function to remove penalties.
        -   `getSherpaActivePenalties(sherpaId)`: Retrieve active penalties for a Sherpa.
    3.  **Discord Bot / Admin Panel Integration**:
        -   Admin command to apply penalties (`/sherpa-admin penalize <sherpa_name> <penalty_type> <reason>`).
        -   Display active penalties on Sherpa's profile in the Admin Panel or potentially on their public profile (with appropriate privacy considerations).
-   **Testing Plan**:
    -   Verify an admin can apply a penalty.
    -   Confirm penalties are recorded correctly in the database.
    -   Test penalty removal.
    -   Ensure active penalties are retrieved correctly for a given Sherpa.
-   **PR Checklist**:
    -   New database table for penalties is defined.
    -   Server actions for penalty management are secure and robust.
    -   Admin interface or bot commands for applying/removing penalties are functional.

### Deliverable 4: Oathkeeper Badges and Score Display

**Goal**: Visually represent Oathkeeper scores and statuses.

-   **Feature Branch**: `feat/phase-3-oathkeeper-badges`
-   **Key Tasks**:
    1.  **Server Actions**:
        -   `getOathkeeperScore(sherpaId)`: Fetch the calculated Oathkeeper score for a Sherpa.
        -   `getOathkeeperStatus(sherpaId)`: Determine if a Sherpa is an "Oathkeeper," "Oathbreaker," or "New Recruit" based on score thresholds.
    2.  **UI Components**:
        -   **Badge Component (`components/sherpa/oathkeeper-badge.tsx`)**: Display a visual badge (e.g., icon, color-coded text) representing the Sherpa's status.
        -   **Score Display (`components/sherpa/oathkeeper-score-display.tsx`)**: Show the numerical Oathkeeper score.
    3.  **Integrate**:
        -   Display badges/scores on Sherpa profiles (public and admin).
        -   Potentially integrate into session participant lists or application review.
-   **Testing Plan**:
    -   Verify correct Oathkeeper score calculation and retrieval.
    -   Test different score thresholds and confirm the correct badge/status is displayed.
    -   Ensure badges and scores are rendered correctly in various UI locations.
-   **PR Checklist**:
    -   New UI components are reusable and well-styled.
    -   Server actions efficiently retrieve score and status.
    -   Integration points are seamless.

---

## 4. General Workflow Guidance

### A. Prioritize Small, Self-Contained Deliverables

Break down large features into the smallest possible units that can be independently developed, tested, and reviewed. This reduces complexity and risk.

### B. Regular Communication and Feedback

-   **Ask Questions**: If anything is unclear, ask! It's better to ask than to make assumptions that lead to rework.
-   **Seek Feedback Early**: Don't wait until a deliverable is "perfect" to seek feedback. Sometimes a quick check can save hours of work.

### C. Testing and Validation

-   **Local Testing**: Always thoroughly test your changes locally before creating a Pull Request.
-   **Review the Code**: Before submitting a PR, do a self-review of your code. Check for:
    -   Correctness (does it meet requirements?)
    -   Readability (is it easy to understand?)
    -   Maintainability (is it easy to change in the future?)
    -   Adherence to coding standards and project conventions.
    -   Error handling and edge cases.
    -   Performance considerations.

---

## 5. Next Steps

We will begin with **Deliverable 1: Admin Review Interface for Sherpa Applications**.

1.  **Create the feature branch**: `feat/phase-3-admin-review-interface`
2.  **Start implementation**: Focus on the database migration (if needed) and the server actions to fetch and update application statuses.
3.  **Develop UI components**: Once server actions are in place, build the React components to display and interact with the applications.

I will guide you through each step, explaining the reasoning and best practices along the way.
