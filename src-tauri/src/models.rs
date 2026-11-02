use serde::{Deserialize, Serialize};

fn default_show_in_tray() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(default)]
    pub python_path: Option<String>,
    pub entry: String,
    #[serde(default)]
    pub args: Option<String>,
    #[serde(default)]
    pub access_url: Option<String>,
    #[serde(default = "default_show_in_tray")]
    pub show_in_tray: bool,
    #[serde(default)]
    pub env_vars: Option<std::collections::HashMap<String, String>>,
    #[serde(default)]
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectView {
    pub id: String,
    pub name: String,
    pub path: String,
    pub python_path: Option<String>,
    pub entry: String,
    pub args: Option<String>,
    pub status: String, // "Running" | "Stopped" | "Error"
    #[serde(default = "default_show_in_tray")]
    pub show_in_tray: bool,
    pub access_url: Option<String>,
    pub pid: Option<u32>,
    pub is_venv: bool,
    pub is_script: bool,
    pub start_time: Option<u64>,
    pub env_vars: Option<std::collections::HashMap<String, String>>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectDetection {
    pub suggested_name: String,
    pub has_venv: bool,
    pub venv_name: Option<String>,
    pub python_path: Option<String>,
    pub entry: Option<String>,
    pub is_script: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartResult {
    pub success: bool,
    pub message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tray_visibility_defaults_on_for_existing_projects_and_preserves_opt_out() {
        let legacy = r#"{"id":"demo","name":"Demo","path":"C:/demo","entry":"main.py"}"#;
        let mut project: ProjectConfig = serde_json::from_str(legacy).unwrap();
        assert!(project.show_in_tray);
        project.show_in_tray = false;
        let saved = serde_json::to_string(&project).unwrap();
        let restored: ProjectConfig = serde_json::from_str(&saved).unwrap();
        assert!(!restored.show_in_tray);
        project.show_in_tray = true;
        let saved = serde_json::to_string(&project).unwrap();
        assert!(serde_json::from_str::<ProjectConfig>(&saved).unwrap().show_in_tray);
    }
}
