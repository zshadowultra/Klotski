# Klotski

A modern, fluid, and highly tactile web implementation of the classic sliding block puzzle game, Klotski (Hua Rong Dao). 

## Play the Game

The objective of the game is to move the largest block (the "Master" piece) to the exit at the bottom center of the board.

*   **Slide** the pieces horizontally or vertically.
*   **Navigate** around the obstacles to clear a path.
*   **Escape** through the red exit indicator at the bottom.

## Features

*   **Fluid Multi-Directional Dragging**: Seamlessly drag pieces around corners in a single, continuous motion without needing to lift your finger.
*   **Tactile Animations**: Powered by Framer Motion, pieces respond with subtle scaling and shadow depth when grabbed, providing a premium, hardware-like feel.
*   **Haptic Feedback**: Integrated web haptics deliver satisfying physical feedback when pieces snap into place, collide, or when you win the game (supported on compatible mobile devices).
*   **Responsive Design**: The board dynamically scales to perfectly fit any screen size, from tall mobile phones to wide desktop monitors, ensuring an optimal playing experience everywhere.
*   **Move Tracking & History**: Keep track of your move count and seamlessly undo your steps to rethink your strategy.

## Tech Stack

*   **React 18**: Component-based UI architecture.
*   **Framer Motion**: Spring-physics based animations for buttery-smooth interactions.
*   **Tailwind CSS**: Utility-first styling for rapid, responsive, and consistent design.
*   **Vite**: Lightning-fast frontend tooling and bundling.

## Getting Started

To run this project locally:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the development server:**
    ```bash
    npm run dev
    ```

3.  **Open your browser:**
    Navigate to `http://localhost:3000` to play the game.

## About Klotski

Klotski (from Polish *klocki* — wooden blocks) is a sliding block puzzle. The most famous variant, often called *Forget-me-not* or *Hua Rong Dao*, features a 4x5 grid with ten blocks of varying sizes. The puzzle is renowned for its difficulty, with the shortest known solution requiring 81 steps!
