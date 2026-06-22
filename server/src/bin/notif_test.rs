// Standalone test tool: watches macOS NotificationCenter logs and prints
// every event. Run this, then trigger a notification with:
//   osascript -e 'display notification "hello" with title "Test"'
//
// Build: cargo build --release --bin notif_test
// Run:   ./target/release/notif_test

use std::io::BufRead;
use std::process::{Command, Stdio};
use std::time::Duration;

fn main() {
    // Also try usernotifictiond
    let processes = ["NotificationCenter", "usernotifictiond"];

    for proc in &processes {
        println!("\n=== Trying process: {} ===", proc);
        match Command::new("log")
            .args([
                "stream",
                "--style",
                "json",
                "--predicate",
                &format!("process == \"{}\"", proc),
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
        {
            Ok(mut child) => {
                if let Some(stdout) = child.stdout.take() {
                    let reader = std::io::BufReader::new(stdout);
                    let start = std::time::Instant::now();
                    let timeout = Duration::from_secs(15);
                    let mut count = 0;

                    for line in reader.lines() {
                        if start.elapsed() > timeout {
                            println!("[timeout after 15s]");
                            break;
                        }
                        let line = match line {
                            Ok(l) => l,
                            Err(_) => break,
                        };
                        if line.trim().is_empty() {
                            continue;
                        }
                        count += 1;

                        // Try to parse as JSON
                        if let Ok(event) =
                            serde_json::from_str::<serde_json::Value>(&line)
                        {
                            let msg_type = event["messageType"].as_i64().unwrap_or(-1);
                            let ev_type = event["eventType"].as_str().unwrap_or("");
                            let msg = event["eventMessage"]
                                .as_str()
                                .unwrap_or("")
                                .to_lowercase();
                            let sender = event["senderImagePath"]
                                .as_str()
                                .unwrap_or("")
                                .rsplit_once('/')
                                .map(|(_, f)| f)
                                .unwrap_or("");

                            // Print ALL events with basic info
                            let summary = format!(
                                "[{}] msgType={} evType={} sender={} msg={}",
                                proc,
                                msg_type,
                                ev_type,
                                sender,
                                &event["eventMessage"]
                                    .as_str()
                                    .unwrap_or("")
                                    .chars()
                                    .take(120)
                                    .collect::<String>()
                            );
                            println!("  {}", summary);

                            // Highlight likely notification events
                            if msg.contains("banner")
                                || msg.contains("title:")
                                || msg.contains("body:")
                                || msg.contains("subtitle:")
                                || msg.contains("posted")
                                || msg.contains("notification")
                            {
                                println!("    ^^^ MATCH");
                            }
                        } else {
                            println!("  [parse error] {}", &line.chars().take(100).collect::<String>());
                        }
                    }
                    println!("[{} events captured]", count);
                    let _ = child.wait();
                } else {
                    println!("  [no stdout]");
                }
            }
            Err(e) => {
                println!("  [spawn error: {}]", e);
            }
        }
    }
}
