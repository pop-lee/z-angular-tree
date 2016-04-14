# Z-Angular-Tree
##　　　———— By LiYunpeng（云鹏@大连）

基于AngularJS1.2.x版本开发,JQuery1.x即可


## 目前为止实现的功能有 Support Feature
1. 节点展开、关闭
2. 同级节点新增
3. 子集节点新增
4. 删除节点

后续会陆续加入缓动效果和拖拽功能

## 安装 install
```
bower install z-angular-tree
```

## 栗子 [example](http://pop-lee.github.io/z-angular-tree/example/index.html)
例子可直接下载运行,无需构建,也可使用gulp进行构建运行


## 开始 Get Start

```html
<div z-tree="tree" tree-data="dataList">
    <!-- node context 节点内容 -->
    <label>this is a node</label>
</div>
```


### 数据源 dataSource
tree-data="dataList",其中dataList的结构如：
```json
[{
    "label": "a",
    "children": []
 }, {
    "label": "b",
    "children": [{
        "label": "b1",
        "children": [{
            "label": "b1-1",
            "children": []
        },{
            "label": "b1-2",
            "children": []
        }]
    }]
}]
```

### 节点数据 node data
* 可通过node来进行访问传入的数据
* 还可访问节点的是否关闭状态,是否选中状态,是否在自己的子集包含选中节点,当前节点的层级数
```html
<div z-tree="tree" tree-data="dataList">
    {{node.label}}
    -- collapsed:"{{$model.$collapsed}}"
    -- hasSelect:"{{$model.$hasSelect}}"
    -- selected:"{{$model.$selected}}"
    -- nodeLevel:"{{$model.$nodeLevel}}"
</div>
```

### 控件引用 tree reference
```html
<div z-tree="tree">
```
$scope.tree 就是引用了树形控件的对象,可以进行如下调用
```javascript
$scope.tree.toggle(node)
$scope.tree.addSameLevelNode(node)
$scope.tree.addSubNode(node)
$scope.tree.delNode(node)
```


### 添加事件 event handle
相应事件卸载controller内即可
```html
<div z-tree="tree" tree-data="dataList">
    <button class="btn btn-xs btn btn-info" ng-click="toggle(node)">toggle</button>
    <button class="btn btn-xs btn-primary" ng-click="addSameLevelNode(node)">add</button>
    <button class="btn btn-xs btn-success" ng-click="addSubNode(node)">add sub</button>
    <button class="btn btn-xs btn-danger" ng-click="delNode(node)">del</button>
</div>
```

### 节点的子节点,可以放在任何想安放的位置 children node position
```html
<div z-tree="tree" tree-data="dataList">
    <button>test</button>
    <div z-tree-node ng-class="{'collapsed':$model.$collapsed}"></div>
</div>
```
or
```html
<div z-tree="tree" tree-data="dataList">
    <div z-tree-node ng-class="{'collapsed':$model.$collapsed}"></div>
    <button>test</button>
</div>
```
or
```html
<div z-tree="tree" tree-data="dataList">
    <button>test</button>
    <div>
        <div>
            <div>
                <div z-tree-node ng-class="{'collapsed':$model.$collapsed}"></div>
            </div>
        </div>
    </div>
</div>
```

## 开源许可协议 License
[The Apache License](https://github.com/pop-lee/z-angular-tree/blob/master/LICENSE)