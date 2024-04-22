"use client";

import { useRouter } from "next/navigation";
import React from "react";
import styles from "./ui/HomePage.module.css";

const Home: React.FC = () => {
  const router = useRouter();

  const handleStartGame = () => {
    router.push("/hint");
  };

  return (
    <main className={styles.container}>
      <button className={styles.aboutGameBtn}>?</button>

      <h1 className={styles.title}>Doodle It</h1>

      <p className={styles.text}>
        Experience a thrilling sketching adventure with our TensorFlow-powered
        app! 🚀🎨 Get a hint, sketch in 30 seconds, and guess the mystery object
        based on revealed features. No more boring prompts – just creative fun!
        🕵️‍♂️🎢🚀🎨
      </p>

      <button onClick={handleStartGame} className={styles.startGameBtn}>
        Let&apos;s Draw!
      </button>
    </main>
  );
};

export default Home;
