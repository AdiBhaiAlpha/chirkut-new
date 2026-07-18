package com.chirkut.app

import android.content.Intent
import android.os.Bundle
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // Install Android 12+ SplashScreen compatibility before super.onCreate()
        val splashScreen = installSplashScreen()
        
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val splashLogo = findViewById<ImageView>(R.id.splash_logo)

        // Start animation sequence:
        // 1. Fade In animation (~300ms)
        splashLogo.animate()
            .alpha(1f)
            .setDuration(300)
            .withEndAction {
                // 2. Stay visible for approximately 2 seconds (2000ms)
                splashLogo.postDelayed({
                    // 3. Fade Out animation (~300ms)
                    splashLogo.animate()
                        .alpha(0f)
                        .setDuration(300)
                        .withEndAction {
                            // 4. Automatically open the main activity after the animation
                            val intent = Intent(this@SplashActivity, MainActivity::class.java)
                            startActivity(intent)
                            finish()
                            
                            // Prevent flash or sudden animations during transition
                            @Suppress("DEPRECATION")
                            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
                        }
                        .start()
                }, 2000)
            }
            .start()
    }
}
