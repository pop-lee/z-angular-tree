/**
 * Created by LiYunpeng on 4/10/16.
 */
angular
    .module('z.angular.tree', [
    ])
    .constant('treeConfig', {
        templateUrl: 'zangular/template/zTreeTemplate.html'
    })
    .directive('zTree', ['$timeout',
        function ($timeout) {
            return {
                restrict: 'AE',
                template:'<div z-tree-node-children></div>',
                scope: {
                    zTree:'=?',
                    treeData: '=',
                    currentSelect: '=?',
                    options: '=?'
                    // onAfterRender: '&'
                },
                transclude:true,
                controller: ['$scope', function( $scope ) {
                    $scope.$nodeChildren = [];
                    $scope.$nodeMap = {};
                    $scope.$keyCount = 0;//用来生成一个全局的ID生成计数标记

                    if(!($scope.currentSelect instanceof Array)) {
                        $scope.currentSelect = [];
                    }
                    $scope.$oldCurrentSelect = [];

                    $scope.options = angular.extend({
                            childrenField:"children",
                            leafNodeCanSelect:true,
                            canMultiple:true,
                            useToggle:false,
                            defaultCollapsed:false
                        },$scope.options);

                    //包含了选中节点或者自己就是选中节点的节点
                    $scope.hasSelectNodeScopeList = [];

                    $scope.node = {};
                    $scope.$watch('treeData',function(newValue) {
                        $scope.node[$scope.options.childrenField] = newValue;
                        eachNodeData($scope.node,function(node) {
                            if(!node.$$_key) {
                                node.$$_key = ++$scope.$keyCount;
                            }
                        });
                    },true);

                    $scope.$watchCollection('hasSelectNodeScopeList',function(newList,oldList) {
                        var i;
                        if(oldList) {
                            for(i=0;i<oldList.length;i++) {
                                oldList[i].$model.$hasSelect = false;
                            }
                        }
                        if(newList) {
                            for(i=0;i<newList.length;i++) {
                                newList[i].$model.$hasSelect = true;
                            }
                        }
                    });
                    //当前选中的节点Scope
                    $scope.$watchCollection('currentSelect',function(newSelect) {
                        var i;
                        var oldSelect = $scope.$oldCurrentSelect;
                        //将原有选中的所有改为不选中
                        for(i=0;i<oldSelect.length;i++) {
                            var oldScope = getScopeByNode(oldSelect[i]);

                            if(oldScope) {
                                oldScope.$model.$selected = false;
                            }
                        }
                        var hasSelectNodeScopeList = [];
                        //将新的选中列表的所有改为选中
                        for(i=0;i<newSelect.length;i++) {
                            var newScope = getScopeByNode(newSelect[i]);
                            if(newScope) {
                                newScope.$model.$selected = true;

                                hasSelectNodeScopeList.push(newScope);
                                eachParentScope(newScope,function(ns) {
                                    hasSelectNodeScopeList.push(ns);
                                });
                            }
                        }
                        $scope.hasSelectNodeScopeList = hasSelectNodeScopeList;
                        $scope.$oldCurrentSelect = [].concat(newSelect);//不使用watch的oldValue,因为watch自带的oldValue是通过Copy出来的,非地址引用
                    },true);

                    $scope.zTree = {}
                    $scope.zTree.selectNode = function(node) {
                        var clickNodeScope = getScopeByNode(node);

                        if($scope.options.leafNodeCanSelect) {
                            if(isLeafNode(clickNodeScope)) {
                                currentSelect(node);
                            }
                        } else {
                            currentSelect(node);
                        }
                    };
                    $scope.zTree.addChildNode = function(node,parentNode) {
                        var children = parentNode[$scope.options.childrenField];
                        if (children != null && children != undefined) {
                            children.push(node);
                        }
                        $timeout(function() {
                            // refreshModel(getScopeByNode(parentNode));
                            expandNode(getScopeByNode(node));
                        })
                    }
                    $scope.zTree.addNode = function(newNode,targetNode) {
                        if(targetNode === void 0) {
                            $scope.treeData.push(newNode);
                        } else {
                            var scope = getScopeByNode(targetNode);
                            var parentData = scope.$parentNodeScope.node;
                            var children = parentData[$scope.options.childrenField];
                            children.splice($.inArray(targetNode, children)+1, 0,newNode);
                        }
                        // $timeout(function() {
                        //     refreshModel(scope.$parentNodeScope);
                        // });
                    }
                    $scope.zTree.delNode = function(node,index) {
                        var scope = getScopeByNode(node);
                        var parentData = scope.$parentNodeScope.node;
                        var children = parentData[$scope.options.childrenField];
                        var flag;
                        if(index) {
                            flag = index;
                        } else {
                            flag = $.inArray(node, children);
                        }
                        children.splice(flag, 1);
                        scope.$parentNodeScope.$nodeChildren.splice(flag,1);
                        //此处不适用递归,引用去掉后让内存自动回收
                        eachTreeScope(scope,function(ns) {
                            if(ns.$model.$selected) {
                                $scope.currentSelect.splice($.inArray(ns.node,$scope.currentSelect),1);
                            }
                            //在map中销毁所有已删除的节点
                            delete $scope.$nodeMap[ns.$nodeKey];
                        });
                        $timeout(function() {
                            refreshModel(scope.$parentNodeScope);
                        });
                    }
                    $scope.zTree.toggle = function(node) {
                        var ns = getScopeByNode(node);
                        if (!ns) {
                            return;
                        }
                        if (ns.$model.$collapsed) {//如果进行展开的操作
                            expandNode(ns);
                        } else {//如果进行关闭
                            collapseNode(ns);
                        }
                    }
                    if($scope.options.useToggle) {
                    } else {//如果使用互斥,则不允许展开和关闭全部
                        $scope.zTree.expandAll = function(node) {
                            var nodeScope = getScopeByNode(node);
                            eachTreeScope(nodeScope, function (ns) {
                                ns.$model.$collapsed = false;
                            });
                        }
                        $scope.zTree.collapseAll = function(node) {
                            var nodeScope = getScopeByNode(node);
                            eachTreeScope(nodeScope, function (ns) {
                                ns.$model.$collapsed = true;
                            });
                        }
                    }

                    var eachNodeData = function(node,fn) {
                        if(node[$scope.options.childrenField] === void 0) node[$scope.options.childrenField]=[];
                        var i,list = node[$scope.options.childrenField];
                        for(i=0;i<list.length;i++) {
                            var node = list[i];
                            fn(node);
                            eachNodeData(node,fn);
                        }
                    }
                    var currentSelect = function(node) {
                        if(!getScopeByNode(node)) return;

                        var index = $.inArray(node,$scope.currentSelect);
                        if(index>=0) {
                            $scope.currentSelect.splice(index,1);
                        } else {
                            $scope.currentSelect.push(node);
                        }
                    }

                    var getScopeByNode = function(node) {
                        if (node === null || node === undefined) {
                            return null;
                        }
                        for(var key in $scope.$nodeMap) {
                            if($scope.$nodeMap[key].node == node) {
                                return $scope.$nodeMap[key];
                            }
                        }
                        return null;
                    }
                    /**
                     * 遍历同级节点Scope,只遍历同级,不深层遍历
                     * @param nodeScope 要遍历同级节点的节点
                     * @param fn
                     * @returns {*}
                     */
                    var eachSameLevelScope = function (nodeScope, fn) {
                        if (nodeScope === undefined || nodeScope === null) {
                            return;
                        }
                        var parentScope = nodeScope.$parentNodeScope;
                        var length = parentScope.$nodeChildren.length;
                        for (var i = 0; i < length; i++) {
                            var ret = fn(parentScope.$nodeChildren[i]);
                            if (ret === "return") {
                                return ret;
                            }
                        }
                    };
                    /**
                     * 遍历树下一级节点(仅下一级,不再深度遍历)
                     * @param nodeScope
                     * @param fn
                     * @returns {*}
                     */
                    var eachNextLevelScope = function (nodeScope, fn) {
                        if (nodeScope === undefined || nodeScope === null) {
                            return;
                        }
                        var length = nodeScope.$nodeChildren.length;
                        for (var i = 0; i < length; i++) {
                            var ret = fn(nodeScope.$nodeChildren[i]);
                            if (ret === "return") {
                                return ret;
                            }
                        }
                    };
                    /**
                     * 遍历包含自己的所有子节点
                     * @param nodeScope
                     * @param fn
                     * @returns {*}
                     */
                    var eachTreeScope = function (nodeScope, fn) {
                        var ret = fn(nodeScope);
                        if (ret === "return") {
                            return ret;
                        } else {
                            return eachNextLevelScope(nodeScope, function (ns) {
                                return eachTreeScope(ns, fn);
                            });
                        }
                    }

                    var eachParentScope = function(nodeScope,fn) {

                        var parentScope = nodeScope.$parentNodeScope;
                        if(parentScope === $scope) {
                            return;
                        } else {
                            fn(parentScope);
                            eachParentScope(parentScope,fn);
                        }
                    }
                    /**
                     * 在某一节点下查找节点
                     * @param nodeScope 要查找的节点
                     * @param parentNodeScope 被查找的树的根节点
                     * @returns {*}
                     */
                    var findScope = function (nodeScope, parentNodeScope) {
                        if (!parentNodeScope) {
                            parentNodeScope = $scope;
                        }
                        var ns = null;
                        eachTreeScope(parentNodeScope, function (eachNodeScope) {
                            if (eachNodeScope === nodeScope) {
                                ns = eachNodeScope;
                                return "return";
                            }
                        });
                        return ns;
                    };
                    /**
                     * 判断是否为叶子节点
                     * @param nodeScope
                     * @returns {boolean}
                     */
                    var isLeafNode = function (nodeScope) {
                        return nodeScope.$nodeChildren.length === 0;
                    };

                    /**
                     * 关闭节点
                     * @param nodeScope
                     */
                    var collapseNode = function (nodeScope) {
                        nodeScope.$model.$collapsed = true;
                    };
                    /**
                     * 展开节点
                     * @param nodeScope
                     */
                    var expandNode = function (nodeScope) {

                        if (!nodeScope.$model.$collapsed) {
                            return;
                        }

                        if ($scope.options.useToggle) {//判断是否使用互斥
                            eachSameLevelScope(nodeScope, function (ns) {
                                if (ns === nodeScope) {
                                    return;
                                }
                                collapseNode(ns);
                            });
                        }
                        //递归展开父级
                        if (nodeScope.$parentNodeScope.$model) {
                            expandNode(nodeScope.$parentNodeScope);
                        }

                        //叶子节点不进行关闭,非叶子节点,进行关闭
                        if (!isLeafNode(nodeScope)) {
                            nodeScope.$model.$collapsed = false;
                        }
                    };
                    var refreshModel = function(nodeScope) {
                        var arr = nodeScope.$nodeChildren;
                        for(var i=0;i<arr.length;i++) {
                            var ns = arr[i];
                            ns.$model.$index = ns.$internalScope.$index;//i;
                            ns.$model.$isFirst = ns.$internalScope.$first;//i===0;
                            ns.$model.$isLast = ns.$internalScope.$last;//i===arr.length-1;
                            ns.$model.$isMiddle = ns.$internalScope.$middle;//!(ns.$model.$isFirst||ns.$model.$isLast);
                        }
                    }

                    this.$treeRootScope = $scope;
                }],
                compile: function(element, attrs, transclude) {
                    return function ( scope, element, attrs, ctrls ) {
                        //递归潜逃时候的transclude,存入scope之后,可在子节点中继续进行调用
                        scope.transclude = transclude;
                    }
                }
            };
        }
    ])
    .directive("zTreeNodeChildren",['$compile','$templateCache','treeConfig', function($compile, $templateCache, treeConfig) {
        return {
            restrict: 'AE',
            template: '<div class="z-tree-node-children" ng-class="{\'collapsed\':$model.$collapsed}">',
            replace:true,
            scope:true,
            controller: function() {
                var template = $templateCache.get(treeConfig.templateUrl);
                this.template = $compile(template);
            },
            link: function( scope, element, attrs, ctrls) {
                ctrls.template(scope, function(clone) {
                    element.html('').append(clone);
                });
            }
        };
    }])
    // .directive("zTreeSelectZone", function() {
    //     return {
    //         restrict: 'AE',
    //         scope: true,
    //         require: "^zTree",
    //         link: function( scope, element, attrs, ctrls) {
    //             element.on('click',function(event) {
    //                 scope.$apply(function() {
    //                     ctrls.$treeRootScope.zTree.selectNode(scope.node);
    //                 });
    //                 //阻止事件继续向上冒泡
    //                 event.stopPropagation();
    //             });
    //         }
    //     };
    // })
    .directive("zTreeNode", function() {//为了让递归的指令都共用rootParentScope
        return {
            require: "^zTree",
            link: function(scope, element, attrs, controller) {

                var rootScope = controller.$treeRootScope;

                scope.transcludeScope = rootScope.$parent.$new();
                scope.transcludeScope.$nodeChildren = [];
                scope.transcludeScope.$parentNodeScope = scope.$parent.$parent;
                scope.transcludeScope.$internalScope = scope;
                scope.transcludeScope.node = scope.node;
                scope.transcludeScope.options = rootScope.options;
                scope.transcludeScope.$nodeKey = scope.node.$$_key;
                scope.transcludeScope.$model = {
                    $index:scope.$index,
                    $isFirst:scope.$first,
                    $isLast:scope.$last,
                    $isMiddle:scope.$middle,
                    $collapsed:scope.node.children.length===0?true:rootScope.options.defaultCollapsed,
                    $hasSelect:false,
                    $selected:false,
                    $nodeLevel:scope.$parent.$parent.$model?scope.$parent.$model.$nodeLevel+1:1//如果有$model则代表不是根节点
                };
                //将scope存入父级的子节点集合数组
                var index = $.inArray(scope.transcludeScope.node,scope.transcludeScope.$parentNodeScope.node[rootScope.options.childrenField]);
                scope.transcludeScope.$parentNodeScope.$nodeChildren.splice(index,0,scope.transcludeScope);
                //将scope加入整个树的map一维存储,以方便快速查找
                rootScope.$nodeMap[scope.transcludeScope.$nodeKey] = scope.transcludeScope;
                rootScope.transclude(scope.transcludeScope, function(clone) {
                    element.html('').append(clone);
                });
                scope.$on('$destroy', function() {
                    scope.transcludeScope.$destroy();
                });
            }
        };
    });
;
