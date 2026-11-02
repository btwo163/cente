//! Global preferences use the Windows startup entry as their source of truth.

#[derive(serde::Serialize)]
pub struct GlobalSettings {
    pub autostart: bool,
}

#[cfg(windows)]
mod startup {
    use std::{io, path::Path};
    use winreg::{RegKey, enums::*};

    const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
    const VALUE_NAME: &str = "Cente";

    fn command(exe: &Path) -> Result<String, String> {
        let path = exe.to_str().ok_or("程序路径不是有效的 Unicode 字符串")?;
        let command = format!("\"{path}\" --autostart");
        if command.encode_utf16().count() > 260 {
            return Err("程序路径过长，请将 Cente 移动到较短路径后再启用开机自启".into());
        }
        Ok(command)
    }

    fn read_entry(key: &RegKey, expected: &str) -> io::Result<bool> {
        match key.get_value::<String, _>(VALUE_NAME) {
            Ok(value) => Ok(value == expected),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(false),
            Err(error) => Err(error),
        }
    }

    fn write_entry(key: &RegKey, enabled: bool, expected: &str) -> io::Result<()> {
        if enabled {
            key.set_value(VALUE_NAME, &expected)
        } else {
            match key.delete_value(VALUE_NAME) {
                Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
                result => result,
            }
        }
    }

    pub fn read() -> Result<bool, String> {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let expected = command(&exe)?;
        match RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags(RUN_KEY, KEY_QUERY_VALUE) {
            Ok(key) => {
                read_entry(&key, &expected).map_err(|e| format!("读取开机自启设置失败：{e}"))
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(false),
            Err(error) => Err(format!("读取开机自启设置失败：{error}")),
        }
    }

    pub fn write(enabled: bool) -> Result<bool, String> {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let expected = command(&exe)?;
        let (key, _) = RegKey::predef(HKEY_CURRENT_USER)
            .create_subkey_with_flags(RUN_KEY, KEY_QUERY_VALUE | KEY_SET_VALUE)
            .map_err(|e| format!("无法访问开机自启设置：{e}"))?;
        write_entry(&key, enabled, &expected).map_err(|e| format!("保存开机自启设置失败：{e}"))?;
        let actual =
            read_entry(&key, &expected).map_err(|e| format!("校验开机自启设置失败：{e}"))?;
        if actual != enabled {
            return Err("系统启动项与请求的设置不一致，请重试".into());
        }
        Ok(actual)
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn startup_command_quotes_spaces_and_unicode() {
            assert_eq!(
                command(Path::new(r"C:\应用程序\Cente App\cente.exe")).unwrap(),
                "\"C:\\应用程序\\Cente App\\cente.exe\" --autostart"
            );
            assert!(command(Path::new(&format!("C:\\{}\\cente.exe", "a".repeat(260)))).is_err());
        }

        #[test]
        fn startup_entry_round_trip_in_isolated_key() {
            // Exercise real registry IO without changing the user's startup preference.
            let root = RegKey::predef(HKEY_CURRENT_USER);
            let path = format!(
                r"Software\CenteTests\{}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            );
            let (key, _) = root.create_subkey(&path).unwrap();
            let expected = command(Path::new(r"C:\测试 app\cente.exe")).unwrap();
            let result = std::panic::catch_unwind(|| {
                assert!(!read_entry(&key, &expected).unwrap());
                write_entry(&key, true, &expected).unwrap();
                assert!(read_entry(&key, &expected).unwrap());
                assert!(!read_entry(&key, "different installation").unwrap());
                write_entry(&key, true, &expected).unwrap();
                write_entry(&key, false, &expected).unwrap();
                assert!(!read_entry(&key, &expected).unwrap());
                write_entry(&key, false, &expected).unwrap();
            });
            drop(key);
            root.delete_subkey(&path).unwrap();
            if let Err(error) = result {
                std::panic::resume_unwind(error);
            }
        }
    }
}

#[tauri::command]
pub fn get_global_settings() -> Result<GlobalSettings, String> {
    #[cfg(windows)]
    {
        Ok(GlobalSettings {
            autostart: startup::read()?,
        })
    }
    #[cfg(not(windows))]
    {
        Err("当前仅支持 Windows 开机自启设置".into())
    }
}

#[tauri::command]
pub fn set_autostart(enabled: bool) -> Result<GlobalSettings, String> {
    #[cfg(windows)]
    {
        Ok(GlobalSettings {
            autostart: startup::write(enabled)?,
        })
    }
    #[cfg(not(windows))]
    {
        let _ = enabled;
        Err("当前仅支持 Windows 开机自启设置".into())
    }
}
