use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NativeSessionState {
    pub status: String,
    pub unlocked_user_id: Option<String>,
    pub unlocked_at: Option<String>,
}

impl Default for NativeSessionState {
    fn default() -> Self {
        Self {
            status: "locked".to_string(),
            unlocked_user_id: None,
            unlocked_at: None,
        }
    }
}

pub struct ProcessSession(pub Mutex<NativeSessionState>);

#[tauri::command]
fn get_native_session(session_state: tauri::State<ProcessSession>) -> NativeSessionState {
    session_state
        .0
        .lock()
        .map(|guard| guard.clone())
        .unwrap_or_default()
}

#[tauri::command]
fn save_native_session(session: NativeSessionState, session_state: tauri::State<ProcessSession>) {
    if let Ok(mut guard) = session_state.0.lock() {
        *guard = session;
    }
}

#[tauri::command]
fn clear_native_session(session_state: tauri::State<ProcessSession>) {
    if let Ok(mut guard) = session_state.0.lock() {
        *guard = NativeSessionState::default();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "initial_core",
            sql: include_str!("../migrations/0001_initial_core.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "catalog",
            sql: include_str!("../migrations/0002_catalog.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "inventory",
            sql: include_str!("../migrations/0003_inventory.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "sales",
            sql: include_str!("../migrations/0004_sales.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "cash",
            sql: include_str!("../migrations/0005_cash.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "purchases",
            sql: include_str!("../migrations/0006_purchases.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "customers",
            sql: include_str!("../migrations/0007_customers.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "expenses",
            sql: include_str!("../migrations/0008_expenses.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .manage(ProcessSession(Mutex::new(NativeSessionState::default())))
        .invoke_handler(tauri::generate_handler![
            get_native_session,
            save_native_session,
            clear_native_session,
        ])
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:sevenpos.db", migrations)
                .build(),
        )
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password| {
                let mut hasher = Sha256::new();
                hasher.update(password);
                hasher.finalize().to_vec()
            })
            .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running sevenpos tauri application");
}
