<?php
     $url = explode('/uploads/vr', $_SERVER['REQUEST_URI']);
     //var_dump($url[0]);
     header('Content-Type: text/xml');
?>
<krpano version="1.19" title="Virtual Tour">
    <!-- set skin settings: bingmaps? gyro? thumbnails? tooltips? -->
    <skin_settings maps="false" maps_type="bing" maps_bing_api_key="" maps_zoombuttons="false" gyro="true" title="true" thumbs="true" thumbs_width="120" thumbs_height="80" thumbs_padding="10" thumbs_crop="0|40|240|160" thumbs_opened="false" thumbs_text="false" thumbs_dragging="true" thumbs_onhoverscrolling="false" thumbs_scrollbuttons="false" thumbs_scrollindicator="false" thumbs_loop="false" tooltips_thumbs="false" tooltips_hotspots="false" tooltips_mapspots="false" loadscene_flags="MERGE" loadscene_blend="BLEND(0.5)" controlbar_offset="20"/>
    <control mousetype="drag2d" mouseaccelerate="0.2"/>

    <include url="<?php echo $url[0]?$url[0]:'' ?>/bower_components/krpano/extend.xml" />
    <view  fovtype="MFOV" fov="120" maxpixelzoom="0" fovmin="70" fovmax="150" />
    <preview url="preview.jpg" />

    <image if="webvr.isenabled">
        <cube url="vr/vr_%s.jpg" />
    </image>
     <image type="CUBE" multires="true" tilesize="1024" if="!webvr.isenabled">

        <level tiledimagewidth="2560" tiledimageheight="2560">
            <cube url="pc/%s/l3/%v/l3_%s_%v_%h.jpg" />
        </level>
        <level tiledimagewidth="1280" tiledimageheight="1280">
            <cube url="pc/%s/l2/%v/l2_%s_%v_%h.jpg" />
        </level>
        <level tiledimagewidth="640" tiledimageheight="640">
            <cube url="pc/%s/l1/%v/l1_%s_%v_%h.jpg" />
        </level>

        <mobile>
            <cube url="mobile/mobile_%s.jpg"/>
        </mobile>
    </image>
        <action name="draghotspot">
            <![CDATA[
            if(%1 != dragging,
            spheretoscreen(ath, atv, hotspotcenterx, hotspotcentery);
            sub(drag_adjustx, mouse.stagex, hotspotcenterx);
            sub(drag_adjusty, mouse.stagey, hotspotcentery);
            draghotspot(dragging);
            ,
            if(pressed,
            sub(dx,mouse.stagex,drag_adjustx);
            sub(dy,mouse.stagey,drag_adjusty);
            screentosphere(dx,dy,ath,atv);
            if(onDrag!==null, onDrag() );
            delayedcall(0, draghotspot(dragging) );
            , if(onDragEnd!==null, onDragEnd() );
            );
            );
            ]]>
        </action>
</krpano>
