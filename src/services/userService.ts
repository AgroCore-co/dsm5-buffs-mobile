import { apiFetch } from "../lib/apiClient";

export const checkUserProfile = async () => {
  try {
    const profile = await apiFetch("/usuarios/me", {  
      method: "GET",
    });
    return { hasProfile: true, profile };
  } catch (error: any) {
    if (error.status === 404 || error.message.includes("Nenhum perfil")) {
      return { hasProfile: false, profile: null };
    }
    throw error;
  }
};

const userService = {
  checkUserProfile,
};

export default userService;
