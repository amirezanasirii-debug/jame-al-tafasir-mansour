import java.awt.Graphics2D;
import java.awt.AlphaComposite;
import java.awt.geom.Ellipse2D;
import java.awt.geom.RoundRectangle2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;

/** Deterministic build-time raster sizing; the original branding asset is retained. */
public class AndroidIcons {
    public static void main(String[] args) throws Exception {
        Path root = Path.of(args.length == 0 ? "." : args[0]);
        BufferedImage source = ImageIO.read(root.resolve("dist/mansour-brand.png").toFile());
        write(source, 432, root.resolve("android/src/main/res/drawable-xxxhdpi/ic_launcher_foreground.png"));
        write(source, 192, root.resolve("android/src/main/res/mipmap-xxxhdpi/ic_launcher.png"));
        write(source, 192, root.resolve("android/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png"));
    }

    private static void write(BufferedImage source, int size, Path target) throws Exception {
        BufferedImage output = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = output.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        if (size == 192) {
            graphics.fill(target.getFileName().toString().contains("round")
                ? new Ellipse2D.Double(1, 1, size - 2, size - 2)
                : new RoundRectangle2D.Double(1, 1, size - 2, size - 2, 48, 48));
            graphics.setComposite(AlphaComposite.SrcIn);
        }
        graphics.drawImage(source, 0, 0, size, size, null);
        graphics.dispose();
        Files.createDirectories(target.getParent());
        ImageIO.write(output, "PNG", target.toFile());
        System.out.println(target.getFileName() + ": " + size + "px, " + Files.size(target) + " bytes");
    }
}
