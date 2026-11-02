/// Only web addresses may be passed to the operating system's URL handler.
pub fn normalize_url(value: &str) -> Result<String, String> {
    let value = value.trim();
    let url = tauri::Url::parse(value)
        .map_err(|_| "访问地址格式无效，请填写完整地址，例如 http://localhost:8000".to_string())?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err("访问地址仅支持 http:// 或 https://".into());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("访问地址不能包含用户名或密码".into());
    }
    Ok(url.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_local_and_remote_web_addresses() {
        assert_eq!(normalize_url(" http://localhost:8000/app?q=1#top ").unwrap(),
            "http://localhost:8000/app?q=1#top");
        assert_eq!(normalize_url("https://example.com").unwrap(), "https://example.com/");
        assert!(normalize_url("http://[::1]:3000").is_ok());
    }

    #[test]
    fn rejects_non_web_addresses_and_credentials() {
        for value in ["", "localhost:8000", "file:///C:/test.exe", "javascript:alert(1)",
            "mailto:a@example.com", "https://user:secret@example.com", "http://"] {
            assert!(normalize_url(value).is_err(), "{value}");
        }
    }

    #[test]
    fn old_project_configs_need_no_migration() {
        let project: crate::models::ProjectConfig = serde_json::from_str(
            r#"{"id":"old","name":"demo","path":"C:/demo","entry":"main.py"}"#).unwrap();
        assert!(project.access_url.is_none());
    }
}
