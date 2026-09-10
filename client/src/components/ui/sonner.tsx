import { useTheme } from "@/contexts/ThemeContext";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "tz-toast",
          title: "tz-toast__title",
          description: "tz-toast__desc",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
