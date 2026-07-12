import { bootGame } from "../boot";
import { TemplateScene } from "../games/template/TemplateScene";

bootGame({
  title: "공용 템플릿 테스트",
  create: (w, h) => new TemplateScene(w, h),
  touchControls: false,
});
