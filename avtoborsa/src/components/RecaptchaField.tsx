import React from "react";
import ReCAPTCHA from "react-google-recaptcha";

import { RECAPTCHA_ENABLED, RECAPTCHA_SITE_KEY } from "../config/api";

interface RecaptchaFieldProps {
  onChange: (token: string | null) => void;
  error?: string;
  resetKey?: number;
}

const RecaptchaField: React.FC<RecaptchaFieldProps> = ({
  onChange,
  error,
  resetKey = 0,
}) => {
  if (!RECAPTCHA_ENABLED) {
    return null;
  }

  return (
    <div style={styles.wrapper}>
      {RECAPTCHA_SITE_KEY ? (
        <div style={styles.widgetWrap}>
          <ReCAPTCHA
            key={resetKey}
            sitekey={RECAPTCHA_SITE_KEY}
            onChange={(token) => onChange(token)}
            onExpired={() => onChange(null)}
            onErrored={() => onChange(null)}
          />
        </div>
      ) : (
        <div style={styles.configError}>
          Липсва `VITE_RECAPTCHA_SITE_KEY` във frontend `.env`.
        </div>
      )}
      {error ? <div style={styles.errorText}>{error}</div> : null}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    marginBottom: 18,
  },
  widgetWrap: {
    display: "inline-flex",
    maxWidth: "100%",
    overflowX: "auto",
  },
  configError: {
    fontSize: 13,
    color: "#991b1b",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    padding: "10px 12px",
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: "#ef4444",
  },
};

export default RecaptchaField;
