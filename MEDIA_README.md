# 📂 Submission Media Index

This folder contains the visual evidence for **Saarthi AI's** submission to the Convolve 4.0 Hackathon (Qdrant Track).
Each file below has been captured from the live, running application to demonstrate specific technical claims.

> **Suggested order for review:**  
> Video → Qdrant Proof → Memory Before/After → Eligibility Block → UI Highlights

---

## 🎥 Primary Demonstration
*   **`core_walkthrough_demo_*.webp`**
    *   **What it is:** A ~2-minute end-to-end walkthrough of the user journey.
    *   **Flow:** Landing Page → Semantic Search → Hybrid RRF Results → Explainable Eligibility → Agentic Fallback.
    *   **Note:** This video serves as the primary visual reference for the system's fluidity and speed.

---

## 🕵️ Forensic Proofs (Technical Validation)
*These screenshots validate the backend logic and invisible system architecture.*
*(Implementation details: Technical Report Sections 6, 8, 9, 14)*

*   **`qdrant_collections_proof_*.png`**
    *   **Claim:** "Dual-Collection Architecture"
    *   **Evidence:** Shows the `mas_scholarships` (Knowledge) and `mas_interactions` (Long-term Memory) collections running side-by-side in the local Qdrant instance.

*   **`memory_before_ranking_*.png`** & **`memory_after_ranking_*.png`**
    *   **Claim:** "Closed-Loop Retrieval with Persistent Vector Memory"
    *   **Evidence:** A "Before & After" comparison showing how a user interaction (clicking a result) instantly re-ranks future search results for that specific user, boosting relevant items.

*   **`eligibility_blocked_proof_*.png`**
    *   **Claim:** "Deterministic Safety Layer"
    *   **Evidence:** Shows a "Rich Student" profile intentionally being blocked from a means-based scholarship. The red flags verify that the deterministic rules engine overrides vector similarity.

---

## 💎 UI & Feature Highlights
*These images demonstrate the "Cyber-Glass" design language and observability features.*

*   **`landing_hero_glass_*.png`**
    *   **Feature:** Premium "First Impression" UI with glassmorphism and motion design.

*   **`search_results_radar_*.png`**
    *   **Feature:** The "Hybrid Search" interface showing match scores, verification badges, and the "Explainable Fit" radar chart.

*   **`scholarship_details_view_*.png`**
    *   **Feature:** Deep-dive view showing the 100-point eligibility breakdown and transparent scoring logic.

*   **`agent_memory_log_*.png`**
    *   **Feature:** The "Glass-Box" Agent stream, revealing the system's internal reasoning steps to the user in real-time.

---

**Authenticity Note**  
All assets were captured from a live local deployment.  
No mockups, no static UI, no staged data.  
Qdrant ran via Docker with dual collections active.
*Verified by Saarthi AI*
