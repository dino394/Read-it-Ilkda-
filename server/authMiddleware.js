import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  try {
    // Authorization 헤더 가져오기
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "인증이 필요합니다.",
      });
    }

    // "Bearer 토큰" 형태인지 확인
    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "올바른 인증 형식이 아닙니다.",
      });
    }

    // JWT 검증
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // 로그인한 사용자 정보를 request에 저장
    req.user = decoded;

    // 다음 단계로 이동
    next();
  } catch (error) {
    console.error("JWT 인증 실패:", error);

    return res.status(401).json({
      success: false,
      message: "유효하지 않은 인증 토큰입니다.",
    });
  }
}